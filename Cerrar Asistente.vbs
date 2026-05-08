Set shell = CreateObject("WScript.Shell")
command = "powershell -ExecutionPolicy Bypass -File """ & Replace(WScript.ScriptFullName, "Cerrar Asistente.vbs", "scripts\stop-app.ps1") & """"
shell.Run command, 0, False
