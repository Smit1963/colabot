import * as vscode from 'vscode'
import ApiKeySettings from './apiKeySettings'
import { SidebarProvider } from './panels/SideBar'
import { Util } from './Util'
import { execReloadWindow, triggerCommand } from './lib/utils'
import { aiCommits } from './aicommits/commands'

export async function activate (context: vscode.ExtensionContext) {
  Util.globalState = context.globalState
  ApiKeySettings.init(context)
  const settings = ApiKeySettings.instance
  const apiKey = await settings.getKeyData()

  const sidebarProvider = new SidebarProvider(context)

  const config = vscode.workspace.getConfiguration('spilot')

  sidebarProvider.setSettings({
    apiKey: apiKey!,
    model: config.get('model') as string,
    temperature: config.get('temperature') as number,
    max_tokens: config.get('maxTokens') as number,
    organizationId: config.get('organizationId') as string
  })

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
    vscode.commands.registerCommand('spilot.fixCode', () => {
      triggerCommand(sidebarProvider, 'fix')
    }),
    vscode.commands.registerCommand('spilot.docsCode', () => {
      triggerCommand(sidebarProvider, 'doc')
    }),
    vscode.commands.registerCommand('spilot.testCode', () => {
      triggerCommand(sidebarProvider, 'test')
    }),
    vscode.commands.registerCommand('spilot.explainCode', () => {
      triggerCommand(sidebarProvider, 'explain')
    }),
    vscode.commands.registerCommand('spilot.clearChat', () => {
      sidebarProvider._view?.webview.postMessage({
        type: 'clearChat'
      })
    }),
    vscode.commands.registerCommand('spilot.chatFeedback', () => {
      vscode.env.openExternal(vscode.Uri.parse('https://github.com/smit23492/spilot/issues'))
    }),
    vscode.commands.registerCommand('spilot.removeApiKeySidebar', async () => {
      if (!apiKey) return
      await settings.deleteKeyData()
      sidebarProvider.setSettings({ apiKey: '' })
      sidebarProvider.updateLLMSettings()
      vscode.window.showInformationMessage('API key removed successfully.')
    })
  )

  vscode.commands.registerCommand('spilot.setApiKey', async () => {
    const tokenInput = await vscode.window.showInputBox({
      password: true
    })
    if (!tokenInput) return

    await settings.storeKeyData(tokenInput)
    execReloadWindow('API key set ✔. Please reload to apply changes.')
  })

  vscode.commands.registerCommand('spilot.removeApiKey', async () => {
    await settings.deleteKeyData()
    execReloadWindow('API key removed. Please reload to apply changes.')
  })

  // AI commits command
  vscode.commands.registerCommand('spilot.aiCommit', () => {
    aiCommits({ settings: sidebarProvider.getSettings() })
  })

  vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
    if (event.affectsConfiguration('spilot.organizationId')) {
      const config = vscode.workspace.getConfiguration('spilot')
      sidebarProvider.setSettings({ organizationId: config.get('organizationId') })
    } else if (event.affectsConfiguration('spilot.model')) {
      const config = vscode.workspace.getConfiguration('spilot')
      sidebarProvider.setSettings({ model: config.get('model') })
    } else if (event.affectsConfiguration('spilot.temperature')) {
      const config = vscode.workspace.getConfiguration('spilot')
      sidebarProvider.setSettings({ temperature: config.get('temperature') })
    } else if (event.affectsConfiguration('spilot.maxTokens')) {
      const config = vscode.workspace.getConfiguration('spilot')
      sidebarProvider.setSettings({ max_tokens: config.get('maxTokens') })
    }

    sidebarProvider.updateLLMSettings()
  })
}

// This method is called when your extension is deactivated
export function deactivate () {}
