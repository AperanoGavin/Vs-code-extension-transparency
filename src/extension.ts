import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "transparency-gavin" is now active!');

    // Créer un indicateur dans la barre de statut
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(eye) Transparency";
    statusBarItem.command = 'transparent-gavin.toggle';
    context.subscriptions.push(statusBarItem);
    statusBarItem.show();

    let disposable = vscode.commands.registerCommand('transparent-gavin.toggle', async () => {
        try {
            const isTransparent = context.globalState.get('isTransparent', false);
            
            if (!isTransparent) {
                // Activer la transparence
                await applyTransparency(context);
                await context.globalState.update('isTransparent', true);
                statusBarItem.text = "$(eye) Transparency ON";
                vscode.window.showInformationMessage('Redémarrez VS Code pour appliquer la transparence.');
            } else {
                // Désactiver la transparence
                await removeTransparency(context);
                await context.globalState.update('isTransparent', false);
                statusBarItem.text = "$(eye) Transparency OFF";
                vscode.window.showInformationMessage('Redémarrez VS Code pour désactiver la transparence.');
            }
        } catch (error) {
            console.error('Erreur:', error);
            vscode.window.showErrorMessage(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
    });

    context.subscriptions.push(disposable);

    // Mettre à jour le statut initial
    if (context.globalState.get('isTransparent', false)) {
        statusBarItem.text = "$(eye) Transparency ON";
    }
}

async function applyTransparency(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration();
    
    // Configuration de la fenêtre
    await config.update('window.titleBarStyle', 'native', vscode.ConfigurationTarget.Global);
    await config.update('window.nativeTabs', true, vscode.ConfigurationTarget.Global);
    
    // Customisation des couleurs
    await config.update('workbench.colorCustomizations', {
        'window.background': '#00000000',
        'editor.background': '#00000000',
        'sideBar.background': '#00000000',
        'activityBar.background': '#00000000',
        'titleBar.activeBackground': '#00000000',
        'titleBar.inactiveBackground': '#00000000',
        'tab.activeBackground': '#00000000',
        'tab.inactiveBackground': '#00000000',
        'statusBar.background': '#00000000',
        'panel.background': '#00000000',
        'terminal.background': '#00000000',
        'breadcrumb.background': '#00000000',
        'editorGroupHeader.tabsBackground': '#00000000',
        'notifications.background': '#00000033',
        'commandCenter.background': '#00000000',
    }, vscode.ConfigurationTarget.Global);

    // Injecter le CSS personnalisé
    const cssContent = `
    /*
     * Force la transparence sur tous les éléments
     */
    body {
        background-color: transparent !important;
    }
    
    .monaco-workbench {
        background-color: transparent !important;
    }
    
    /* Éditeur principal */
    .monaco-editor,
    .monaco-editor .margin,
    .monaco-editor-background,
    .monaco-editor .inputarea.ime-input {
        /* background-color: rgba(0, 0, 0, 0.3) !important; */
        background-color: transparent !important
    }
    
    /* Sidebar et autres éléments */
    .sidebar,
    .sidebar .tree-view-container,
    .activity-bar,
    .title-bar,
    .panel-container,
    .terminal-outer-container,
    .notifications-list-container,
    .notification-toast,
    .quick-input-widget,
    .suggest-widget,
    .monaco-list,
    .explorer-folders-view {
        background-color: transparent !important;
    }
    
    /* Amélioration de la lisibilité */
    .monaco-list-row:hover {
        background-color: rgba(255, 255, 255, 0.1) !important;
    }
    
    .monaco-list-row.selected {
        background-color: rgba(255, 255, 255, 0.2) !important;
    }
    
    /* Style pour les menus */
    .monaco-menu {
        background-color: rgba(30, 30, 30, 0.7) !important;
        backdrop-filter: blur(10px);
    }
    `;

    const customCssPath = path.join(context.globalStorageUri.fsPath, 'custom.css');
    await fs.promises.mkdir(path.dirname(customCssPath), { recursive: true });
    await fs.promises.writeFile(customCssPath, cssContent, 'utf8');

    // Injecter les configurations spécifiques à macOS
    if (os.platform() === 'darwin') {
        const vscodePath = '/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-sandbox/workbench/workbench.html';
        try {
            if (fs.existsSync(vscodePath)) {
                // Sauvegarder une copie du fichier original si elle n'existe pas déjà
                const backupPath = `${vscodePath}.backup`;
                if (!fs.existsSync(backupPath)) {
                    fs.copyFileSync(vscodePath, backupPath);
                }
    
                // Lire le fichier original
                let content = fs.readFileSync(vscodePath, 'utf8');
    
                // Injecter le CSS personnalisé
                const cssInjection = `<style>${cssContent}</style>`;
                if (!content.includes(cssInjection)) {
                    content = content.replace('</head>', `${cssInjection}</head>`);
                    fs.writeFileSync(vscodePath, content, 'utf8');
                }
            }
        } catch (error) {
            console.error('Erreur lors de la modification du fichier workbench:', error);
        }
    }
}

async function removeTransparency(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration();
    
    // Restaurer les configurations par défaut
    await config.update('window.titleBarStyle', undefined, vscode.ConfigurationTarget.Global);
    await config.update('window.nativeTabs', undefined, vscode.ConfigurationTarget.Global);
    await config.update('workbench.colorCustomizations', undefined, vscode.ConfigurationTarget.Global);

    // Supprimer le CSS personnalisé
    const customCssPath = path.join(context.globalStorageUri.fsPath, 'custom.css');
    try {
        await fs.promises.unlink(customCssPath);
    } catch (error) {
        // Ignorer si le fichier n'existe pas
    }

    // Restaurer le fichier workbench original sur macOS
    if (os.platform() === 'darwin') {
        const vscodePath = '/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-sandbox/workbench/workbench.html';
        const backupPath = `${vscodePath}.backup`;
        try {
            if (fs.existsSync(backupPath)) {
                fs.copyFileSync(backupPath, vscodePath);
            }
        } catch (error) {
            console.error('Erreur lors de la restauration du fichier workbench:', error);
        }
    }
}

export function deactivate() {
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}