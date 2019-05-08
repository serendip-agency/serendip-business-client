/**
 * @module ClientAuth
 */

import { TokenModel } from "serendip-business-model";
import { HttpClientService } from "./HttpClientService";
import { LocalStorageService } from "./LocalStorageService";
import * as _ from "underscore";
import { DataService } from "./DataService";
import { ClientServiceInterface } from "../Client";


/**
 * this interface defines options needed to be configured to AuthService
 * Example of configuring authService using this interface with env 
 * ```typescript
 * import * as SBC from "serendip-business-client";
 * import * as dotenv from "dotenv";
 * dotenv.config();
 * SBC.AuthService.configure({
 * username: process.env["sbc.username"],
 * password: process.env["sbc.password"]
 * });
 * ```
 */
export interface AuthServiceOptions {
  username: string;
  password: string;
}





/**
 *  AuthService implements [[ClientServiceInterface]] and is responsible for working with our business API authentication service.
 * 
 */
export class AuthService implements ClientServiceInterface {

  /**
   * options is static variable
   */
  static options: AuthServiceOptions = {
    username: "",
    password: ""
  };

  /**
   * helper function to configure authService options
   * @param options [AuthServiceOptions]
   */
  static configure(options: AuthServiceOptions) {
    AuthService.options = options;
  }


  /**
   * AuthService start method will try to authenticate with business api using options you provided for this service.
   */
  async start() {
    if (!(await this.token())) {
      if (!AuthService.options.username || !AuthService.options.password) {

        console.log('provide usernme/password in AuthService.options to get token at start.')
      } else {
        const token = await this.login({
          username: AuthService.options.username,
          password: AuthService.options.password
        });

        console.log("> AuthService got token", token);
        
      }
    } else {
      console.log(
        "> AuthService using token in localStorage",
        await this.token()
      );
    }
  }
  profileValid = false;
  loggedIn = false;

  get apiUrl() {
    return DataService.server;
  }

  profile: any = {};

  constructor(
    private httpClientService: HttpClientService,
    private localStorageService: LocalStorageService
  ) {}
  async logout() {
    this.localStorageService.clear();
    // await IdbDeleteAllDatabases();
  }
  async token(): Promise<TokenModel> {
    let token: TokenModel;
    if (this.localStorageService.getItem("token")) {
      token = JSON.parse(this.localStorageService.getItem("token"));
    }

    if (token) {
      if (token.expires_at - Date.now() < 60000) {
        token = await this.refreshToken(token);
      }
    }

    if (!token) {
      this.localStorageService.removeItem("token");
    }

    // console.log('token()',token);

    if (token && token.access_token) {
      this.loggedIn = true;
      return token;
    } else {
      this.loggedIn = false;
      return undefined;
    }
  }

  async register(mobile: string, password: string): Promise<any> {
    return this.httpClientService.request({
      method: "post",
      url: this.apiUrl + "/api/auth/register",
      json: {
        username: mobile,
        mobile: mobile,
        password: password
      }
    });
  }

  async sendVerify(mobile: string): Promise<any> {
    return this.httpClientService.request({
      method: "post",
      url: this.apiUrl + "/api/auth/sendVerifySms",
      json: {
        mobile: mobile
      }
    });
  }

  async sendOneTimePassword(mobile: string, timeout?: number): Promise<any> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject({ status: 0 });
      }, timeout || 3000);

      return this.httpClientService
        .request({
          method: "post",
          url: this.apiUrl + "/api/auth/oneTimePassword",
          json: {
            mobile: mobile
          }
        })

        .then(res => {
          resolve(res);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  async sendResetPasswordToken(mobile: string): Promise<any> {
    return this.httpClientService.request({
      url: this.apiUrl + "/api/auth/sendResetPasswordToken",
      json: {
        mobile: mobile
      }
    });
  }

  async verifyMobile(mobile: string, code: string): Promise<any> {
    return this.httpClientService.request({
      method: "post",
      url: this.apiUrl + "/api/auth/verifyMobile",
      json: {
        mobile: mobile,
        code: code
      }
    });
  }

  async resetPassword(
    mobile: string,
    code: string,
    password: string,
    passwordConfirm: string
  ): Promise<any> {
    return this.httpClientService.request({
      url: this.apiUrl + "/api/auth/resetPassword",
      json: {
        mobile: mobile,
        code: code,
        password: password,
        passwordConfirm: passwordConfirm
      }
    });
  }

  async login(opts: {
    username?: string;
    mobile?: string;
    password?: string;
    oneTimePassword?: string;
  }): Promise<TokenModel> {
    let newToken;

    try {
      newToken = await this.httpClientService.request({
        url: this.apiUrl + "/api/auth/token",
        method: "post",
        json: _.extend(
          {
            grant_type: "password"
          },
          opts
        )
      });
    } catch (error) {
      throw error;
    }

    if (!newToken) {
      throw new Error("empty token");
    }

    this.loggedIn = true;

    this.localStorageService.setItem("token", JSON.stringify(newToken));

    return newToken;
  }

  async refreshToken(token: TokenModel): Promise<TokenModel> {
    try {
      const newToken = await this.httpClientService.request({
        method: "post",
        url: this.apiUrl + "/api/auth/refreshToken",
        json: {
          refresh_token: token.refresh_token,
          access_token: token.access_token
        }
      });

      this.localStorageService.setItem("token", JSON.stringify(newToken));
      return newToken;
    } catch (res) {
      if (res.status === 401 || res.status === 400) {
        this.logout();
      } else {
        return token;
      }
    }
  }
}
