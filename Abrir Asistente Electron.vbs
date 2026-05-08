Set shell = CreateObject("WScript.Shell")
command = "powershell -ExecutionPolicy Bypass -File """ & Replace(WScript.ScriptFullName, "Abrir Asistente Electron.vbs", "scripts\start-electron.ps1") & """"
shell.Run command, 0, False
