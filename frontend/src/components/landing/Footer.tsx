'use client'

export function Footer() {
  return (
    <footer className="relative border-t border-white/10 py-12 px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center">
                <span className="btn-text-white font-bold text-sm">R</span>
              </div>
              <span className="font-bold text-lg">ResumeAI</span>
            </div>
            <p className="text-sm theme-text-tertiary">
              AI-powered career intelligence platform with privacy at its core.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm theme-text-tertiary">
              <li><a href="#features" className="hover:opacity-100 transition-opacity">Features</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Pricing</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">API</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm theme-text-tertiary">
              <li><a href="#" className="hover:opacity-100 transition-opacity">About</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Blog</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm theme-text-tertiary">
              <li><a href="#" className="hover:opacity-100 transition-opacity">Privacy</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Terms</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Security</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between text-sm theme-text-quaternary">
          <p>© 2024 ResumeAI. All rights reserved.</p>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <a href="#" className="hover:theme-text transition-colors">Twitter</a>
            <a href="#" className="hover:theme-text transition-colors">LinkedIn</a>
            <a href="#" className="hover:theme-text transition-colors">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
