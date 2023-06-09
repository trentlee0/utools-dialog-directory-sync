import {
  Action,
  ListItem,
  ListRenderFunction,
  MutableListTemplate,
  NoneTemplate,
  hideAndOutPlugin,
  templateBuilder
} from 'utools-utils'
import { execPowerShell, execAppleScript } from 'utools-utils/preload'
import { setTimeout } from 'timers/promises'
import path = require('path')

const store = { focusInputDelay: 0.15, fallbackPath: utools.getPath('desktop') }

async function switchDirectory(dirPath: string, focusInputDelay: number) {
  if (utools.isWindows()) {
    utools.simulateKeyboardTap('l', 'ctrl')
  } else {
    utools.simulateKeyboardTap('g', 'command', 'shift')
  }
  await setTimeout(focusInputDelay * 1000)
  utools.hideMainWindowTypeString(dirPath)
  utools.simulateKeyboardTap('enter')
}

class Switch implements NoneTemplate {
  code = 'switch'

  async getQuickSwitchPath(fallbackPath: string) {
    try {
      if (utools.isWindows()) {
        const script = `
          chcp 65001
          $shell = New-Object -ComObject Wscript.Shell
          $app = New-Object -COM 'Shell.Application'
          $map = $app.Windows(0) | Select-Object LocationURL
          Write-Output $map.LocationURL`
        const { stdout } = await execPowerShell(script)
        return stdout.split('\r\n')[1] ?? fallbackPath
      }

      const script = `
        tell application "Finder"
          get POSIX path of (folder of the front window as alias)
        end tell`
      return (await execAppleScript(script, true)).stdout
    } catch (err) {
      return fallbackPath
    }
  }

  async enter() {
    hideAndOutPlugin()
    const switchPath = await this.getQuickSwitchPath(store.fallbackPath)
    await switchDirectory(switchPath, store.focusInputDelay)
  }
}

class SwitchList implements MutableListTemplate {
  code = 'switch-list'

  async getOpenedPaths() {
    if (utools.isWindows()) {
      const script = `
        chcp 65001
        $shell = New-Object -ComObject Wscript.Shell
        $app = New-Object -COM 'Shell.Application'
        $app.Windows() | ForEach-Object { $_.LocationURL } | Write-Output`
      const { stdout } = await execPowerShell(script)
      return stdout
        .replace(/file:\/\/\//g, '')
        .split('\r\n')
        .filter((item, index) => item !== '' && index > 0)
    } else {
      const script = `
        tell application "Finder"
          try 
            set paths to URL of target of Finder windows
            set pathList to ""
            repeat with path in paths
              set pathList to pathList & "\n" & path
            end repeat
            pathList
          end try
        end tell`
      const { stdout } = await execAppleScript(script, true)
      return stdout
        .replace(/file:\/\//g, '')
        .split('\n')
        .filter((item) => item !== '')
    }
  }

  async enter(action: Action, render: ListRenderFunction) {
    const list = await this.getOpenedPaths()
    if (!list.length) {
      list.push(store.fallbackPath)
    }
    render(
      list.map((item) => ({
        title: path.basename(item),
        description: item,
        icon: utools.getFileIcon(item)
      }))
    )
  }

  async select(action: Action, item: ListItem) {
    hideAndOutPlugin()
    await switchDirectory(item.description, store.focusInputDelay)
  }
}

window.exports = templateBuilder()
  .none(new Switch())
  .mutableList(new SwitchList())
  .build()
