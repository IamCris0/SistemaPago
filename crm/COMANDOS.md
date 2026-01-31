# 🎮 Comandos Útiles - Mawewe CRM

## 🚀 Inicio Rápido

### Iniciar el servidor
```bash
npm start
```
o
```bash
npx serve
```

### Ver en el navegador
```
http://localhost:3000
```

---

## 📦 NPM Commands

```bash
npm start              # Iniciar servidor (puerto automático)
npm run dev            # Iniciar en puerto 3000
npm run serve          # Modo SPA
npm install            # Instalar dependencias
```

---

## 🛠️ Comandos de Serve

```bash
npx serve                    # Puerto automático
npx serve -p 3000           # Puerto específico
npx serve -s                # Modo SPA (Single Page)
npx serve -d                # Debug mode
npx serve --help            # Ver todas las opciones
```

---

## 🔍 Testing

### Verificar API
```bash
curl https://mawewe.com.ec/api/employees.php?action=list
```

### Ver estructura del proyecto
```bash
tree -L 2
```

### Ver archivos
```bash
ls -la
```

---

## 🐛 Debug

### Ver logs en consola del navegador
```
F12 → Console
```

### Ver peticiones de red
```
F12 → Network
```

### Limpiar caché
```
Ctrl + F5         (Windows)
Cmd + Shift + R   (Mac)
```

---

## 📝 Git Commands (Opcional)

```bash
git init                    # Inicializar repositorio
git add .                   # Agregar archivos
git commit -m "mensaje"     # Guardar cambios
git status                  # Ver estado
```

---

## 🎨 Desarrollo

### Watch mode (con live-reload)
```bash
npx live-server
```

### O usar VS Code Live Server
```
Click derecho → Open with Live Server
```

---

## 📊 Útiles

### Ver puerto usado
```bash
# Windows
netstat -ano | findstr :3000

# Mac/Linux
lsof -i :3000
```

### Matar proceso en puerto
```bash
# Windows
taskkill /PID <PID> /F

# Mac/Linux
kill -9 <PID>
```

---

## 🚀 Producción

### Subir archivos
```bash
# Usando FileZilla o similar
FTP → mawewe.com.ec
```

### Verificar en producción
```
https://mawewe.com.ec/crm/
```

---

## 🆘 Ayuda

Si tienes problemas:
1. Lee el README.md
2. Revisa la consola del navegador (F12)
3. Verifica que el servidor esté corriendo
4. Limpia el caché del navegador

---

**¿Más ayuda?**  
📧 info@mawewe.com.ec  
📱 +593 98 183 2313
