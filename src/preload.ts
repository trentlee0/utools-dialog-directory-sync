import { NoneTemplate, hideAndOutPlugin, templateBuilder } from 'utools-utils'
import { execPowerShell, execAppleScript } from 'utools-utils/preload'
import { setTimeout } from 'timers/promises'

async function quickSwitchPathOnMacOs(
  focusInputDelay: number,
  fallbackPath: string
) {
  const script = `
    tell application "Finder"
        get POSIX path of (folder of the front window as alias)
    end tell`
  let dirPath: string
  try {
    const { stdout } = await execAppleScript(script, true)
    dirPath = stdout
  } catch (err) {
    dirPath = fallbackPath
  }
  utools.simulateKeyboardTap('g', 'command', 'shift')
  await setTimeout(focusInputDelay * 1000)

  utools.hideMainWindowTypeString(dirPath)
  utools.simulateKeyboardTap('enter')
}

async function quickSwitchPathOnWindows(
  focusInputDelay: number,
  fallbackPath: string
) {
  const script = `
    chcp 65001
    $shell = New-Object -ComObject Wscript.Shell
    $app = New-Object -COM 'Shell.Application'
    $map = $app.Windows(0) | Select-Object LocationURL
    Write-Output $map.LocationURL`
  let dirPath: string
  try {
    const { stdout } = await execPowerShell(script)
    dirPath = stdout.split('\r\n')[1] ?? fallbackPath
  } catch (err) {
    dirPath = fallbackPath
  }
  utools.simulateKeyboardTap('l', 'ctrl')
  await setTimeout(focusInputDelay * 1000)

  utools.hideMainWindowTypeString(dirPath)
  utools.simulateKeyboardTap('enter')
}

class Switch implements NoneTemplate {
  code = 'switch'

  async enter() {
    const focusInputDelay = 0.15
    const fallbackPath = utools.getPath('desktop')
    hideAndOutPlugin()
    if (utools.isWindows()) {
      await quickSwitchPathOnWindows(focusInputDelay, fallbackPath)
    } else {
      await quickSwitchPathOnMacOs(focusInputDelay, fallbackPath)
    }
  }
}

window.exports = templateBuilder().none(new Switch()).build()
