```
npm install 
npm rebuild 
```

```
npm run dev

```

```
npm start 
```

To build

```
npm run dist
```

this part creates the installer 
```json
    "win": {
      "target": [
        "nsis",
        "zip"
      ],
      "icon": "public/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
```