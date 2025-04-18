import type * as vscode from 'vscode'

const accessTokenKey = 'spilot-access-token'
const refreshTokenKey = 'spilot-refresh-token'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class Util {
  static globalState: vscode.ExtensionContext['globalState']

  static getRefreshToken (): string {
    return this.globalState.get<string>(refreshTokenKey) ?? ''
  }

  static getAccessToken (): string {
    return this.globalState.get<string>(accessTokenKey) ?? ''
  }

  static isLoggedIn (): boolean {
    return (
      !!this.globalState.get(accessTokenKey) &&
      !!this.globalState.get(refreshTokenKey)
    )
  }
}
