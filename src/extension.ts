import * as vscode from 'vscode'
import ApiKeySettings from './apiKeySettings'
import { SidebarProvider } from './panels/SideBar'
import { Util } from './Util'
import { triggerCommand } from './lib/utils'
import { aiCommits } from './aicommits/commands'

export async function activate (context: vscode.ExtensionContext) {
  Util.globalState = context.globalState
  ApiKeySettings.init(context)
  const settings = ApiKeySettings.instance
  const apiKey = await settings.getKeyData()

  const sidebarProvider = new SidebarProvider(context, apiKey!)

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarProvider.viewType,
      sidebarProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('colabot-vscode.fixCode', () => {
      triggerCommand(sidebarProvider, 'fix')
    }),
    vscode.commands.registerCommand('colabot-vscode.docsCode', () => {
      triggerCommand(sidebarProvider, 'doc')
    }),
    vscode.commands.registerCommand('colabot-vscode.testCode', () => {
      triggerCommand(sidebarProvider, 'test')
    }),
    vscode.commands.registerCommand('colabot-vscode.explainCode', () => {
      triggerCommand(sidebarProvider, 'explain')
    }),
    vscode.commands.registerCommand('colabot-vscode.clearChat', () => {
      sidebarProvider._view?.webview.postMessage({
        type: 'clearChat'
      })
    }),
    vscode.commands.registerCommand('colabot-vscode.chatFeedback', () => {
      vscode.env.openExternal(vscode.Uri.parse('https://github.com/felipetodev/colabot/issues'))
    })
  )

  vscode.commands.registerCommand('colabot-vscode.setApiKey', async () => {
    const tokenInput = await vscode.window.showInputBox({
      password: true
    })
    if (!tokenInput) return

    await settings.storeKeyData(tokenInput)
    const action = 'Reload'
    const msgReload = 'API key set ✔. Please reload to apply changes.'
    vscode.window.showInformationMessage(msgReload, action).then((selectedAction) => {
      if (selectedAction === action) {
        vscode.commands.executeCommand('workbench.action.reloadWindow')
      }
    })
  })

  vscode.commands.registerCommand('colabot-vscode.removeApiKey', async () => {
    await settings.deleteKeyData()
    const action = 'Reload'
    const msgReload = 'API key removed. Please reload to apply changes.'
    vscode.window.showInformationMessage(msgReload, action).then((selectedAction) => {
      if (selectedAction === action) {
        vscode.commands.executeCommand('workbench.action.reloadWindow')
      }
    })
  })

  // AI commits command
  vscode.commands.registerCommand('colabot-vscode.aiCommit', () => { aiCommits(apiKey!) })
}

// This method is called when your extension is deactivated
export function deactivate () {}
