import { NoneTemplate, templateBuilder, execPowerShell, execAppleScript } from 'utools-utils'
import { setTimeout } from 'timers/promises'

async function quickSwitchPathOnMacOs(focusInputDelay: number, fallbackPath: string) {
  const script = `
    tell application "Finder"
        get POSIX path of (folder of the front window as alias)
    end tell`
  let dirPath: string
  try {
    const { stdout } = await execAppleScript(script)
    dirPath = stdout
  } catch (err) {
    dirPath = fallbackPath
  }
  utools.simulateKeyboardTap('g', 'command', 'shift')
  await setTimeout(focusInputDelay * 1000)

  utools.hideMainWindowTypeString(dirPath)
  utools.simulateKeyboardTap('enter')
}

async function quickSwitchPathOnWindows(focusInputDelay: number, fallbackPath: string) {
  const script = `
    $shell = New-Object -ComObject Wscript.Shell
    $app = New-Object -COM 'Shell.Application'
    $map = $app.Windows(0) | Select-Object LocationURL
    $map.LocationURL`
  let dirPath: string
  try {
    const { stdout } = await execPowerShell(script)
    dirPath = stdout.trim() ? stdout : fallbackPath
  } catch (err) {
    dirPath = fallbackPath
  }
  utools.simulateKeyboardTap('l', 'ctrl')
  await setTimeout(focusInputDelay * 1000)

  utools.hideMainWindowTypeString(dirPath)
  utools.simulateKeyboardTap('enter')
}

export const none: NoneTemplate = {
  code: 'switch',
  explain: '同步当前目录到文件对话框',
  cmds: ['快速切换', '同步对话框目录', 'Quick Switch', 'Sync Dialog Directory'],
  handler: async () => {
    const focusInputDelay = 0.15
    const fallbackPath = utools.getPath('desktop')
    utools.hideMainWindow()
    utools.outPlugin()
    if (utools.isWindows()) {
      await quickSwitchPathOnWindows(focusInputDelay, fallbackPath)
    } else {
      await quickSwitchPathOnMacOs(focusInputDelay, fallbackPath)
    }
  }
}

export default templateBuilder()
  .none(none)
  .build()
