import { useState, useEffect, useRef } from 'react'
import { Rocket, Play, CheckCircle2, AlertCircle, Circle, Eye, Terminal, Zap } from 'lucide-react'

const StatusIndicator = ({ status }) => {
  const statusConfig = {
    idle: { color: 'text-slate-400', icon: Circle, label: 'IDLE' },
    working: { color: 'text-amber-400 animate-pulse', icon: AlertCircle, label: 'PROCESSING' },
    success: { color: 'text-emerald-400', icon: CheckCircle2, label: 'SUCCESS' },
    error: { color: 'text-red-400', icon: AlertCircle, label: 'ERROR' }
  }
  
  const config = statusConfig[status] || statusConfig.idle
  const Icon = config.icon
  
  return (
    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2">
      <Icon size={16} className={config.color} />
      <span className={`text-xs font-bold tracking-wider ${config.color}`}>
        {config.label}
      </span>
    </div>
  )
}

function App() {
  const [terraformOutput, setTerraformOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [status, setStatus] = useState('idle')
  const terminalRef = useRef(null)
  
  // Development mode detection
  const isDev = import.meta.env.DEV
  
  // Form state
  const [projectName, setProjectName] = useState('')
  const [githubToken, setGithubToken] = useState('')
  const [awsRegion, setAwsRegion] = useState('us-east-1')

  useEffect(() => {
    console.log('ElectronAPI disponibile:', !!window.electronAPI)
    
    if (window.electronAPI) {
      window.electronAPI.onTerraformLog((logData) => {
        setTerraformOutput(prev => prev + logData.data)
        
        // Update status based on log type
        if (logData.type === 'success') {
          setStatus('success')
          setIsRunning(false)
        } else if (logData.type === 'error') {
          setStatus('error')
          setIsRunning(false)
        } else if (logData.type === 'info') {
          setStatus('working')
        }
      })
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeTerraformLogListener()
      }
    }
  }, [])

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terraformOutput])

  const runTerraformCommand = (payload) => {
    if (!window.electronAPI) {
      alert('ElectronAPI non disponibile')
      return
    }

    setTerraformOutput('')
    setIsRunning(true)
    setStatus('working')
    window.electronAPI.runTerraform(payload)
  }

  const handleVerifyPlan = () => {
    // Validation
    if (!projectName.trim()) {
      alert('⚠️ Project Name è richiesto')
      return
    }
    
    if (!githubToken.trim()) {
      alert('⚠️ GitHub Token è richiesto')
      return
    }

    console.log('Verify Plan clicked', { projectName, githubToken, awsRegion })
    
    const payload = {
      action: 'verify',
      config: {
        projectName: projectName.trim(),
        token: githubToken.trim(),
        awsRegion: awsRegion
      }
    }
    
    runTerraformCommand(payload)
  }

  const handleDeploy = () => {
    // Validation
    if (!projectName.trim()) {
      alert('⚠️ Project Name è richiesto')
      return
    }
    
    if (!githubToken.trim()) {
      alert('⚠️ GitHub Token è richiesto')
      return
    }

    // Double confirmation for deploy
    const confirmDeploy = confirm(
      `🚀 Sei sicuro di voler deployare il progetto "${projectName}"?\n\n` +
      `DeployWizard creerà un repository GitHub pubblico e potrebbe incorrere in costi.`
    )
    
    if (!confirmDeploy) {
      return
    }

    console.log('Deploy Infrastructure clicked', { projectName, githubToken, awsRegion })
    
    const payload = {
      action: 'deploy',
      config: {
        projectName: projectName.trim(),
        token: githubToken.trim(),
        awsRegion: awsRegion
      }
    }
    
    runTerraformCommand(payload)
  }

  const clearOutput = () => {
    setTerraformOutput('')
    setStatus('idle')
  }

  const testTerraformVersion = () => {
    // Legacy test function - keep for testing
    runTerraformCommand('terraform --version')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-sans">
      {/* Header */}
      <div className="text-3xl font-bold mb-8 flex items-center gap-3 text-emerald-400 justify-between">
        <div className="flex items-center gap-3">
          <Rocket size={40} className="text-emerald-400" />
          <div>
            <h1 className="text-emerald-400">DeployWizard</h1>
            <p className="text-sm text-slate-400 font-normal tracking-wide">Enterprise Infrastructure Management Platform</p>
          </div>
        </div>
        <StatusIndicator status={status} />
      </div>

      {/* Configuration Zone */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl mb-6">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Zap size={24} className="text-emerald-400" />
          <span className="text-emerald-400">PROJECT CONFIGURATION</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              placeholder="my-terraform-project"
            />
          </div>

          {/* GitHub Token */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">
              GitHub Token
            </label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              placeholder="ghp_xxxxxxxxxxxx"
            />
          </div>

          {/* AWS Region */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">
              AWS Region
            </label>
            <select
              value={awsRegion}
              onChange={(e) => setAwsRegion(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            >
              <option value="us-east-1">us-east-1 (N. Virginia)</option>
              <option value="us-west-2">us-west-2 (Oregon)</option>
              <option value="eu-west-1">eu-west-1 (Ireland)</option>
              <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4 border-t border-slate-800">
          <button
            onClick={handleVerifyPlan}
            disabled={isRunning}
            className={`${
              isRunning
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-500'
            } text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2 uppercase tracking-wider text-sm`}
          >
            <Eye size={18} />
            {isRunning ? 'Processing...' : 'VERIFY PLAN'}
          </button>
          
          <button
            onClick={handleDeploy}
            disabled={isRunning}
            className={`${
              isRunning
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500'
            } text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2 uppercase tracking-wider text-sm`}
          >
            <Play size={18} />
            {isRunning ? 'Processing...' : 'DEPLOY INFRASTRUCTURE'}
          </button>

          <button
            onClick={clearOutput}
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-3 px-6 rounded-lg transition-colors uppercase tracking-wider text-sm"
          >
            Clear
          </button>

          {/* Debug/Test button - only show in development */}
          {isDev && (
            <button
              onClick={testTerraformVersion}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-colors uppercase tracking-wider text-sm"
            >
              Test TF
            </button>
          )}
        </div>
      </div>

      {/* Terminal Window */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          </div>
          <Terminal size={20} className="text-emerald-400" />
          <span className="text-emerald-400 font-bold uppercase tracking-wider text-sm">Terminal Output</span>
        </div>
        
        <div
          ref={terminalRef}
          className="bg-black border border-slate-800 rounded-xl p-4 font-mono text-sm h-64 overflow-y-auto custom-scrollbar"
        >
          {terraformOutput ? (
            <pre className="text-emerald-500 whitespace-pre-wrap leading-relaxed">
              {terraformOutput}
            </pre>
          ) : (
            <div className="text-slate-500">
              <span className="text-emerald-500">$</span> Waiting for commands...
              <br />
              <span className="text-slate-600"># Configure your project above and click VERIFY PLAN or DEPLOY INFRASTRUCTURE to get started.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
