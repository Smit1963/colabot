import {
  env,
  Uri,
  window,
  workspace,
  type ExtensionContext,
  type Webview,
  type WebviewViewProvider,
  type WebviewView,
} from "vscode";
import { getNonce, getUri } from "../lib/utils";
import ApiKeySettings from "../apiKeySettings";
import { Util } from "../Util";
import { type Settings } from "../types";
// import { Credentials } from '../authentication'

export class SidebarProvider implements WebviewViewProvider {
  public static readonly viewType = "colabot-sidebar";
  _view?: WebviewView;
  private _settings: Settings = {
    apiKey: "",
    top_p: 1,
    max_tokens: 150,
    model: "gpt-3.5-turbo",
    frequency_penalty: 0,
    presence_penalty: 0,
    stream: true,
    n: 1,
    temperature: 0.3,
    organizationId: "",
  };

  constructor(private readonly _context: ExtensionContext) {}

  public setSettings(settings: Settings) {
    this._settings = { ...this._settings, ...settings };
  }

  public getSettings() {
    return this._settings;
  }

  public updateLLMSettings() {
    this._view?.webview.postMessage({
      type: "updateSettings",
      settings: this._settings,
    });
  }

  public resolveWebviewView(webviewView: WebviewView) {
    this._view = webviewView;
    this._setWebviewMessageListener(this._view.webview);
    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      // Restrict the webview to only load resources from the `out` and `webview-ui/build` directories
      localResourceRoots: [
        Uri.joinPath(this._context.extensionUri, "out"),
        Uri.joinPath(this._context.extensionUri, "webview-ui/build"),
      ],
    };

    webviewView.webview.html = this._getHtmlForWebview(
      webviewView.webview,
      this._context.extensionUri
    );
  }

  public revive(panel: WebviewView) {
    this._view = panel;
  }

  private _getHtmlForWebview(webview: Webview, extensionUri: Uri) {
    const stylesUri = getUri(webview, extensionUri, [
      "webview-ui",
      "build",
      "assets",
      "index.css",
    ]);
    const scriptUri = getUri(webview, extensionUri, [
      "webview-ui",
      "build",
      "assets",
      "index.js",
    ]);

    const nonce = getNonce();

    const config = workspace.getConfiguration();
    const currentTheme = config.get("workbench.colorTheme");

    return /* html */ `
      <!DOCTYPE html>
      <html lang='en'>
        <head>
          <meta charset='UTF-8' />
          <meta name='viewport' content='width=device-width, initial-scale=1.0' />
          <meta http-equiv='Content-Security-Policy' content='default-src https://api.openai.com/v1/completions https://api.openai.com/v1/chat/completions https://tiktoken.pages.dev/js/cl100k_base.json; img-src https: data:; style-src ${
            webview.cspSource
          }; script-src 'nonce-${nonce}';'>
          <link rel='stylesheet' type='text/css' href='${stylesUri}'>
          <title>Spilot: AI assistant 🤖</title>
          <script nonce='${nonce}'>
            window.llmSettings = ${JSON.stringify(this._settings)};
            window.currentTheme = ${JSON.stringify(currentTheme)};
            window.accessToken = ${JSON.stringify(Util.getAccessToken())};
          </script>
        </head>
        <body>
          <div id='root'></div>
          <script type='module' nonce='${nonce}' src='${scriptUri}'></script>
        </body>
      </html>
    `;
  }

  private async _setWebviewMessageListener(webview: Webview) {
    // const credentials = new Credentials()
    // await credentials.initialize(this._context)
    webview.onDidReceiveMessage(async (message: any) => {
      const command = message.command;
      const text = message.text;

      switch (command) {
        case "apiKeyMissing": {
          ApiKeySettings.init(this._context);
          const settings = ApiKeySettings.instance;
          await settings.storeKeyData(text);
          this.setSettings({ apiKey: text });
          webview.postMessage({
            type: "updateSettings",
            settings: this._settings,
          });
          break;
        }
        case "apiSidebarError": {
          window.showErrorMessage(text);
          break;
        }
        case "selectedText": {
          const editor = window.activeTextEditor;
          if (editor) {
            const selection = editor.selection;
            const selectedText = editor.document.getText(selection).trim();

            if (selectedText.length > 0) {
              webview.postMessage({
                type: "selectedText",
                editor: {
                  selectedText,
                  language: editor.document.languageId,
                },
              });
            }
          }
          break;
        }
        case "replaceSelectedCode": {
          const editor = window.activeTextEditor;
          if (!editor) return;
          const selection = editor.selection;

          if (editor.document.getText(selection)) {
            editor.edit((editBuilder) => {
              editBuilder.replace(selection, text);
              window.showTextDocument(editor.document, text);
            });
          } else {
            editor.edit((editBuilder) => {
              editBuilder.insert(editor.selection.active, text);
              window.showTextDocument(editor.document, editor.viewColumn);
            });
          }
          break;
        }
        case "copyToClipboard": {
          env.clipboard.writeText(text);
          break;
        }
      }
    });
  }
}
