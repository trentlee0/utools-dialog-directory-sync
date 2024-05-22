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
import * as path from 'path'

const store = { focusInputDelay: 0.15, fallbackPath: utools.getPath('desktop') }

async function switchDirectory(dirPath: string, focusInputDelay: number) {
  dirPath = dirPath.trim()
  if (utools.isWindows()) {
    const { stdout } = await execPowerShell(`Get-Clipboard`)
    const oldClip = stdout.replace(/[\r\n]{1,2}$/, '')
    utools.simulateKeyboardTap('l', 'ctrl')
    utools.copyText(dirPath)
    await setTimeout(focusInputDelay * 1000)
    utools.simulateKeyboardTap('v', 'ctrl')
    utools.simulateKeyboardTap('enter')
    utools.copyText(oldClip)
  } else {
    const script = `
      tell application "System Events"
        set processName to name of first application process whose frontmost is true
        keystroke "g" using {shift down, command down}
        tell window 1 of process processName
          set spendTime to 0
          try
            if splitter group 1 of sheet 1 exists then -- 文件保存框
              repeat until (sheet 1 of sheet 1) exists
                delay 0.01
                set spendTime to spendTime + 1
                if spendTime is greater than 30 then
                  exit repeat
                end if
              end repeat
              set value of text field 1 of sheet 1 of sheet 1 to "${dirPath}"
            else -- 文件打开框
              repeat until (text field 1 of sheet 1) exists
                delay 0.02
                set spendTime to spendTime + 1
                if spendTime is greater than 15 then
                  exit repeat
                end if
              end repeat
              set value of text field 1 of sheet 1 to "${dirPath}"
            end if
            key code 76
          on error
            set oldClip to the clipboard
            set the clipboard to "${dirPath}"
            keystroke "v" using {command down}
            key code 76
            set the clipboard to oldClip
          end
        end tell
      end tell`
    await execAppleScript(script)
  }
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
    if (utools.isDev()) {
      utools.hideMainWindow()
    } else {
      hideAndOutPlugin()
    }
    const switchPath = await this.getQuickSwitchPath(store.fallbackPath)
    await switchDirectory(switchPath, store.focusInputDelay)
  }
}

class SwitchList implements MutableListTemplate {
  code = 'switch-list'
  placeholder = '搜索已打开的目录，回车切换'

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
      list
        .map((item) => decodeURI(item))
        .map((item) => ({
          title: path.basename(item),
          description: item,
          icon: utools.getFileIcon(item)
        }))
    )
  }

  async select(action: Action, item: ListItem) {
    if (utools.isDev()) {
      utools.hideMainWindow()
    } else {
      hideAndOutPlugin()
    }
    await switchDirectory(item.description, store.focusInputDelay)
  }
}

window.exports = templateBuilder()
  .none(new Switch())
  .mutableList(new SwitchList())
  .build()
