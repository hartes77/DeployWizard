import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import { writeFile, mkdir, access, rm } from 'fs/promises';
import { constants } from 'fs';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

// Workspace configuration
const WORKSPACE_DIR = resolve(process.cwd(), 'terraform-workspace');

// Terraform template generator
function generateMainTf(config) {
  return `terraform {
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 5.0"
    }
  }
}

variable "github_token" { 
  type = string
  sensitive = true
}
variable "project_name" { type = string }

provider "github" {
  token = var.github_token
}

resource "github_repository" "repo" {
  name        = var.project_name
  description = "Created via DeployWizard (Terraform)"
  visibility  = "public"
  auto_init   = true
}

resource "github_repository_file" "index" {
  repository          = github_repository.repo.name
  branch              = "main"
  file                = "index.html"
  content             = "<h1>Deployed via DeployWizard 🚀</h1><p>Enterprise Infrastructure Management Platform.</p>"
  commit_message      = "Init via DeployWizard"
  overwrite_on_create = true
}

output "repository_url" {
  value = github_repository.repo.html_url
}

output "repository_name" {
  value = github_repository.repo.name
}
`;
}

// Workspace management
async function setupWorkspace() {
  try {
    // Check if workspace exists
    await access(WORKSPACE_DIR, constants.F_OK);
    // Clean existing workspace
    await rm(WORKSPACE_DIR, { recursive: true, force: true });
  } catch (error) {
    // Directory doesn't exist, which is fine
  }
  
  // Create fresh workspace
  await mkdir(WORKSPACE_DIR, { recursive: true });
  console.log('Workspace created:', WORKSPACE_DIR);
}

async function writeMainTf(config) {
  const templateContent = generateMainTf(config);
  const mainTfPath = join(WORKSPACE_DIR, 'main.tf');
  await writeFile(mainTfPath, templateContent, 'utf8');
  console.log('main.tf written to:', mainTfPath);
  return mainTfPath;
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

async function checkTerraformAvailable() {
  try {
    await execAsync('which terraform');
    return true;
  } catch (error) {
    return false;
  }
}

// Enterprise Terraform execution function
async function executeTerraformCommand(command, event, workingDir, env = {}) {
  return new Promise((resolve, reject) => {
    const args = command.split(' ').filter(arg => arg.trim() !== '');
    const terraformProcess = spawn(args[0], args.slice(1), {
      cwd: workingDir,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...env }
    });

    let output = '';

    terraformProcess.stdout.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      event.sender.send('terraform-log', {
        type: 'stdout',
        data: dataStr
      });
    });

    terraformProcess.stderr.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      event.sender.send('terraform-log', {
        type: 'stderr',
        data: dataStr
      });
    });

    terraformProcess.on('error', (error) => {
      event.sender.send('terraform-log', {
        type: 'error',
        data: `Errore durante l'esecuzione del processo: ${error.message}\n`
      });
      reject(error);
    });

    terraformProcess.on('close', (code) => {
      if (code === 0) {
        event.sender.send('terraform-log', {
          type: 'success',
          data: `✅ Comando "${command}" completato con successo (codice ${code})\n\n`
        });
        resolve({ code, output });
      } else {
        event.sender.send('terraform-log', {
          type: 'error',
          data: `❌ Comando "${command}" terminato con errore (codice ${code})\n\n`
        });
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

// Enterprise IPC Handler
ipcMain.on('run-terraform', async (event, payload) => {
  try {
    // Check if payload is the new format or legacy string
    let action, config;
    
    if (typeof payload === 'string') {
      // Legacy format - fallback for testing
      const isTerraformAvailable = await checkTerraformAvailable();
      
      if (!isTerraformAvailable) {
        event.sender.send('terraform-log', {
          type: 'error',
          data: 'ERRORE: Terraform non trovato. Installalo per continuare.\n'
        });
        return;
      }

      await executeTerraformCommand(payload, event, process.cwd()); // payload è stringa qui
      return;
    }

    // New enterprise format
    action = payload.action;
    config = payload.config;

    event.sender.send('terraform-log', {
      type: 'info',
      data: `🚀 DeployWizard - Iniziando ${action === 'verify' ? 'VERIFY PLAN' : 'DEPLOY'}\n`
    });

    // Validation
    if (!config.projectName || !config.token) {
      event.sender.send('terraform-log', {
        type: 'error',
        data: '❌ Errore: Project Name e GitHub Token sono richiesti\n'
      });
      return;
    }

    // Check Terraform availability
    const isTerraformAvailable = await checkTerraformAvailable();
    if (!isTerraformAvailable) {
      event.sender.send('terraform-log', {
        type: 'error',
        data: '❌ ERRORE: Terraform non trovato. Installalo per continuare.\n'
      });
      return;
    }

    // STEP 1: Setup Workspace
    event.sender.send('terraform-log', {
      type: 'info',
      data: '📁 Creando workspace di lavoro...\n'
    });
    
    await setupWorkspace();
    
    // STEP 2: Generate main.tf
    event.sender.send('terraform-log', {
      type: 'info',
      data: '📝 Generando configurazione Terraform (main.tf)...\n'
    });
    
    await writeMainTf(config);

    // STEP 3: Setup Environment Variables
    const terraformEnv = {
      TF_VAR_github_token: config.token,
      TF_VAR_project_name: config.projectName,
      TF_LOG: 'INFO'
    };

    event.sender.send('terraform-log', {
      type: 'info',
      data: '🔧 Configurando variabili d\'ambiente...\n'
    });

    // STEP 4: Terraform Init
    event.sender.send('terraform-log', {
      type: 'info',
      data: '⚙️  Inizializzando Terraform...\n'
    });
    
    await executeTerraformCommand('terraform init', event, WORKSPACE_DIR, terraformEnv);

    // STEP 5: Execute based on action
    if (action === 'verify') {
      event.sender.send('terraform-log', {
        type: 'info',
        data: '🔍 Eseguendo terraform plan...\n'
      });
      
      await executeTerraformCommand('terraform plan', event, WORKSPACE_DIR, terraformEnv);
      
      event.sender.send('terraform-log', {
        type: 'success',
        data: '✨ VERIFY PLAN completato! Controlla l\'output sopra per i dettagli.\n'
      });

    } else if (action === 'deploy') {
      event.sender.send('terraform-log', {
        type: 'info',
        data: '🚀 Eseguendo terraform apply (auto-approved)...\n'
      });
      
      await executeTerraformCommand('terraform apply -auto-approve', event, WORKSPACE_DIR, terraformEnv);
      
      event.sender.send('terraform-log', {
        type: 'success',
        data: `🎉 DEPLOY completato! Il repository "${config.projectName}" è stato creato su GitHub!\n`
      });
    }

  } catch (error) {
    event.sender.send('terraform-log', {
      type: 'error',
      data: `💥 Errore durante l'esecuzione: ${error.message}\n`
    });
  }
});