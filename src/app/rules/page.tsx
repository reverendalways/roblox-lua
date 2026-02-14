"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";

const UploadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const DiscordIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
  </svg>
);

export default function RulesPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isLoggedIn, userInfo, isAuthLoading, logout } = useAuth();
  const [section, setSection] = useState<'tos' | 'privacy' | 'guidelines' | 'copyright' | 'disclaimer'>('tos');

  const handleLogout = () => { logout(); };

  const sections = [
    { key: 'tos', label: 'Terms of Service' },
    { key: 'privacy', label: 'Privacy Policy' },
    { key: 'guidelines', label: 'Community Guidelines' },
    { key: 'copyright', label: 'Copyright / DMCA' },
    { key: 'disclaimer', label: 'Disclaimer' },
  ] as const;

  const renderContent = () => {
    switch (section) {
      case 'tos':
        return (
          <div className="space-y-6">
            <h1 className="text-4xl font-bold">Terms of Service</h1>
            <p className="text-gray-300 text-base">Welcome to ScriptVoid! By accessing or using our website, you agree to comply with and be bound by the following Terms of Service. Please read them carefully.</p>
            <div className="space-y-5 text-gray-300 text-base leading-relaxed">
              <div>
                <h2 className="font-semibold text-white text-lg">1. Acceptance of Terms</h2>
                <p>By using ScriptVoid, you agree to these Terms of Service and all applicable laws and regulations. If you do not agree, please do not use the site.</p>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">2. Age Requirement and Supervision</h2>
                <ul className="list-disc ml-6 space-y-1">
                  <li>You must be at least 13 years old to create an account and use ScriptVoid.</li>
                  <li>We do not allow account creation for users under 13.</li>
                  <li>If you are under 13, you may browse the site but cannot register or submit content.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">3. User Responsibilities</h2>
                <ul className="list-disc ml-6 space-y-1">
                  <li>You are responsible for all content you upload, share, or interact with.</li>
                  <li>You must be at least 13 years old or have parental supervision as stated above.</li>
                  <li>You agree not to use ScriptVoid for illegal or harmful purposes.</li>
                  <li>No uploading content containing viruses, malware, spyware, keyloggers, or harmful code.</li>
                  <li>Harassment, hate speech, bullying, or abusive behavior is prohibited.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">4. Exploits and Scripts</h2>
                <ul className="list-disc ml-6 space-y-1">
                  <li>ScriptVoid is a platform for sharing exploits and scripts for Roblox experiences.</li>
                  <li>Uploading exploits is allowed if they are not malicious or designed to steal data or damage devices.</li>
                  <li>You acknowledge exploits can affect game integrity and use them at your own risk.</li>
                  <li>We do not endorse cheating; we provide a platform for responsible sharing.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">5. Content Ownership and License</h2>
                <ul className="list-disc ml-6 space-y-1">
                  <li>You retain ownership of original scripts and content.</li>
                  <li>You grant ScriptVoid a non‑exclusive, worldwide, royalty‑free license to display, distribute, and promote your content on the platform.</li>
                  <li>Do not upload content you lack rights or permission to share.</li>
                  <li>We may remove content that violates these Terms or is inappropriate.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">6. Acceptable Behavior</h2>
                <ul className="list-disc ml-6 space-y-1">
                  <li>No spamming or unsolicited advertising.</li>
                  <li>No impersonation of users, moderators, or staff.</li>
                  <li>Maintain respectful, constructive communication.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">7. Enforcement and Consequences</h2>
                <p>Violations may result in content removal, temporary or permanent suspension, or legal action. We reserve the right to remove or disable access to any content or account at our discretion.</p>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">8. Disclaimers and Limitation of Liability</h2>
                <ul className="list-disc ml-6 space-y-1">
                  <li>All scripts and exploits are shared “as‑is” with no guarantees of safety, function, or suitability.</li>
                  <li>Use is at your own risk. We are not responsible for damages, losses, or consequences from use of the site or downloaded scripts.</li>
                  <li>No warranty regarding availability, security, or uninterrupted access.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">9. Changes to Terms</h2>
                <p>We may update these Terms at any time. Changes will appear here with an updated date. Continued use after updates constitutes acceptance.</p>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">10. Contact Us</h2>
                <p>Questions or reports? Join our <a href="https://discord.gg/3WwQsq78mE" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Discord server</a>.</p>
              </div>
            </div>
          </div>
        );
      case 'privacy':
        return (
          <div className="space-y-6">
            <h1 className="text-4xl font-bold">Privacy Policy</h1>
            <p className="text-gray-300 text-base">At ScriptVoid, we respect your privacy. This policy explains the limited information we collect and how we use it.</p>
            <div className="space-y-5 text-gray-300 text-base leading-relaxed">
              <div>
                <h2 className="font-semibold text-white text-lg">Information We Collect</h2>
                <ul className="list-disc ml-6 space-y-1">
                  <li><span className="font-medium">Account Information:</span> Username, email address, and password when you register. Passwords are hashed, we don't know your passwords.</li>
                  <li><span className="font-medium">Online Status:</span> Whether you are currently active on the site.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">2. How We Use Your Information</h2>
                <ul className="list-disc ml-6 space-y-1">
                  <li>To create and manage your account.</li>
                  <li>To communicate important updates and provide support.</li>
                  <li>To ensure the security and proper functioning of the site.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">3. Information Sharing</h2>
                <ul className="list-disc ml-6 space-y-1">
                  <li>We do not sell, trade, or share your personal information for marketing purposes.</li>
                  <li>We may use trusted service providers under strict confidentiality.</li>
                  <li>We may disclose information if required by law or to protect rights or safety.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">4. Data Security</h2>
                <ul className="list-disc ml-6 space-y-1">
                  <li>We take reasonable measures to protect your data.</li>
                  <li>No system is completely secure; absolute protection cannot be guaranteed.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">5. Your Rights</h2>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Update or delete your account by contacting us.</li>
                  <li>Opt out of promotional messages where applicable.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">6. Children’s Privacy</h2>
                <ul className="list-disc ml-6 space-y-1">
                  <li>ScriptVoid does not knowingly allow users under 13 to create accounts or collect their personal information (such as email or username).</li>
                  <li>Since account creation is restricted to 13+, we do not collect personal info from children under 13.</li>
                  <li>If you believe a child under 13 has created an account, please contact us to have it removed.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">7. Changes to This Policy</h2>
                <p>We may update this policy; changes will appear here with an updated date. Continued use means acceptance.</p>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">8. Contact Us</h2>
                <p>Questions or concerns? Reach us via our <a href="https://discord.gg/3WwQsq78mE" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Discord server</a>.</p>
              </div>
            </div>
          </div>
        );
      case 'guidelines':
        return (
          <div className="space-y-6">
            <h1 className="text-4xl font-bold">Community Guidelines / Rules</h1>
            <p className="text-gray-300 text-base">Welcome to ScriptVoid! To keep our community positive and safe, follow these guidelines when interacting on the site.</p>
            <div className="space-y-5 text-gray-300 text-base leading-relaxed">
              <div>
                <h2 className="font-semibold text-white text-lg">1. Be Respectful</h2>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Treat all members with respect and kindness.</li>
                  <li>No harassment, bullying, hate speech, or discrimination.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">2. Share Responsibly</h2>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Only upload exploits/scripts you created or have permission to share.</li>
                  <li>No viruses, malware, spyware, keyloggers, or harmful code.</li>
                  <li>Do not share stolen or copyrighted material without permission.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">3. No Illegal or Harmful Activity</h2>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Do not promote or engage in illegal activity.</li>
                  <li>Do not share content intended to steal data or damage systems.</li>
                  <li>Use exploits responsibly and at your own risk.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">4. Keep Communication Civil</h2>
                <ul className="list-disc ml-6 space-y-1">
                  <li>No spamming, excessive self‑promotion, or irrelevant posts.</li>
                  <li>Avoid trolling, flaming, or disruptive behavior.</li>
                  <li>No impersonation of other users or staff.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">5. Protect Privacy</h2>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Do not share personal information (yours or others').</li>
                  <li>Respect privacy in all interactions.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">6. Follow Site Rules</h2>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Comply with the Terms of Service and all posted policies.</li>
                  <li>Report violations or suspicious behavior to moderators.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">7. Botting & Automation</h2>
                <ul className="list-disc ml-6 space-y-1">
                  <li>No automated account creation, traffic generation, or artificial boosting (views, likes, points).</li>
                  <li>No scraping at abusive rates or using bots to interact with the platform UI.</li>
                  <li>API usage (if provided) must honor published rate limits.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">8. Consequences</h2>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Violations may lead to content removal, warnings, temporary suspension, or permanent bans.</li>
                  <li>Serious or repeated offenses (including botting / automation abuse) may result in permanent account and network bans.</li>
                  <li>Severe violations may prompt legal action where applicable.</li>
                  <li>Behavior not explicitly listed here but deemed harmful, disruptive, exploitative, or contrary to the platform’s intent may still result in moderation action.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">Need Help?</h2>
                <p>Contact staff via our <a href="https://discord.gg/3WwQsq78mE" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Discord server</a>.</p>
              </div>
            </div>
          </div>
        );
      case 'copyright':
        return (
          <div className="space-y-6">
            <h1 className="text-4xl font-bold">Copyright & DMCA Policy</h1>
            <p className="text-gray-300 text-base">We respect creators’ rights. If you believe your copyrighted work has been posted on ScriptVoid without permission, follow the steps below.</p>
            <div className="space-y-5 text-gray-300 text-base leading-relaxed">
              <div>
                <h2 className="font-semibold text-white text-lg">1. How to Report</h2>
                <p>If you find content that infringes your copyright, report it via our <a href="https://discord.gg/3WwQsq78mE" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Discord server</a>. Include:</p>
                <ul className="list-disc ml-6 space-y-1 mt-2">
                  <li>Description or link to the original work you own.</li>
                  <li>Proof of ownership (e.g., source file, timestamp, repository, publication link).</li>
                  <li>Exact location of the infringing content on ScriptVoid (URL or page reference).</li>
                  <li>Any extra context that helps us verify the claim.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">2. What Happens Next</h2>
                <ul className="list-disc ml-6 space-y-1">
                  <li>We review the report as soon as possible.</li>
                  <li>If valid, we remove or restrict the reported content.</li>
                  <li>The uploader is notified of the action.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">3. If Content Was Removed by Mistake</h2>
                <p>If you believe your content was taken down in error, contact us on Discord with a clear explanation and any supporting proof. We will re‑evaluate.</p>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">4. Repeat Infringers</h2>
                <p>Accounts repeatedly posting copyrighted material without permission may face suspension or permanent bans.</p>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">5. Reporting Channel</h2>
                <p>All copyright reports and counter‑requests must be submitted through our Discord server only. We do not process these via phone or email.</p>
              </div>
              <div>
                <h2 className="font-semibold text-white text-lg">Need Help?</h2>
                <p>Open a ticket or contact staff in our <a href="https://discord.gg/3WwQsq78mE" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Discord server</a>.</p>
              </div>
            </div>
          </div>
        );
      case 'disclaimer':
        return (
          <div className="space-y-6">
            <h1 className="text-4xl font-bold">Disclaimer</h1>
            <div className="space-y-5 text-gray-300 text-base leading-relaxed">
              <p>ScriptVoid provides a platform for sharing Roblox scripts and exploits created and shared by users. By using this site, you acknowledge and agree to the following:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>All scripts, exploits, and content are provided “as-is” without any warranties, express or implied. We do not guarantee functionality, safety, or error-free operation.</li>
                <li>Using exploits may violate Roblox’s terms of service and could lead to consequences outside of ScriptVoid’s control. You use all content at your own risk.</li>
                <li>ScriptVoid is not responsible for any damage, loss, security issues, account actions, or other consequences resulting from use of scripts shared on the site.</li>
                <li>We do not endorse cheating or malicious behavior; we host content for responsible sharing only.</li>
                <li>We make no guarantees regarding availability, performance, security, or uninterrupted access to the platform.</li>
                <li>By using ScriptVoid, you accept full responsibility for your actions and agree to hold ScriptVoid harmless from any claims, liabilities, or damages.</li>
              </ul>
              <p>If you do not agree with this disclaimer, you should discontinue using the site.</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="max-w-6xl mx-auto py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap gap-3">
          {sections.map(s => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border ${section === s.key ? 'bg-white text-gray-900 border-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-6 sm:p-8 shadow-md">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
