"use client"

import Link from "next/link"
import { ArrowLeft, Shield } from "lucide-react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ModeToggle } from "@/components/mode-toggle"

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background selection:bg-primary selection:text-black overflow-hidden relative">
      {/* Background Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none mix-blend-overlay dark:mix-blend-overlay mix-blend-multiply"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black opacity-80 dark:opacity-80 opacity-0"></div>
      
      {/* Animated background elements with deterministic values */}
      <div className="absolute inset-0 -z-10">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-primary/5 dark:bg-primary/10"
            style={{
              width: 80 + ((i * 37) % 250),
              height: 80 + ((i * 43) % 250),
              left: `${(i * 13) % 100}%`,
              top: `${(i * 17) % 100}%`,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 10 + ((i * 7) % 10),
              repeat: Number.POSITIVE_INFINITY,
              delay: (i * 0.8) % 5,
            }}
          />
        ))}
      </div>

      <header className="absolute top-0 left-0 w-full p-8 z-20">
        <Link href="/" className="flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors group font-mono text-sm uppercase tracking-widest">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Eject / Return</span>
        </Link>
      </header>

      <main className="container my-8 space-y-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-2 shadow-lg backdrop-blur-sm bg-background/80 border-primary/20">
            <CardHeader className="space-y-1 text-center border-b">
              <div className="flex justify-center mb-2">
                <Shield className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
              <p className="text-muted-foreground">Last Updated: April 15, 2025</p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold text-primary mb-3">1. Introduction</h2>
                  <p>
                    Welcome to BeatNet (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). This Privacy Policy explains how we collect, use, disclose, 
                    and safeguard your information when you use our decentralized music platform.
                  </p>
                  <p>
                    Our platform allows users to vote on songs that are queued and played based on community preferences. 
                    We are committed to protecting your personal information and your right to privacy.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold text-primary mb-3">2. Information We Collect</h2>
                  
                  <div className="mb-4">
                    <h3 className="text-xl font-medium mb-2">2.1 Personal Information</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li><strong>Account Information</strong>: When you create an account, we collect your name, email address, and password.</li>
                      <li><strong>Profile Information</strong>: Any information you provide in your user profile, including profile pictures and optional biographical information.</li>
                      <li><strong>Authentication Information</strong>: If you sign in through third-party services (like Google), we receive information from these services.</li>
                    </ul>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="text-xl font-medium mb-2">2.2 Usage Information</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li><strong>Voting Activity</strong>: We collect data about the songs you vote for.</li>
                      <li><strong>Listening History</strong>: Information about the songs you&apos;ve listened to on our platform.</li>
                      <li><strong>Device Information</strong>: Information about the devices you use to access our service, including IP address, browser type, and operating system.</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium mb-2">2.3 Blockchain and Decentralized Data</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Certain activities on our platform may be recorded on a public blockchain, including voting records and community governance participation.</li>
                      <li>Public blockchain data is inherently public and cannot be deleted.</li>
                    </ul>
                  </div>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold text-primary mb-3">3. How We Use Your Information</h2>
                  <p>We use your information to:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Create and manage your account</li>
                    <li>Provide, maintain, and improve our services</li>
                    <li>Process and record your votes for song queuing</li>
                    <li>Analyze usage patterns to enhance user experience</li>
                    <li>Communicate with you about updates, features, and opportunities</li>
                    <li>Enforce our terms, conditions, and policies</li>
                    <li>Comply with legal obligations</li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold text-primary mb-3">4. Sharing Your Information</h2>
                  <p>We may share your information with:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Other users (limited to public profile information and voting activity)</li>
                    <li>Service providers who assist in our operations</li>
                    <li>Legal and regulatory authorities when required by law</li>
                    <li>Potential buyers in the event of a merger, acquisition, or sale (with notice)</li>
                  </ul>
                </section>
                
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold text-primary mb-3">5. Your Rights and Choices</h2>
                  <p>
                    Depending on your location, you may have rights regarding your personal information, including:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Accessing, correcting, or deleting your personal information</li>
                    <li>Withdrawing consent for data processing</li>
                    <li>Data portability</li>
                    <li>Restricting or objecting to certain processing activities</li>
                  </ul>
                  <p className="mt-3">
                    Please note that blockchain-recorded data cannot be removed due to the immutable nature of blockchain technology.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold text-primary mb-3">6. Data Security</h2>
                  <p>
                    We implement reasonable security measures to protect your personal information from unauthorized access, 
                    disclosure, alteration, and destruction. However, no method of transmission over the Internet or electronic 
                    storage is 100% secure.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold text-primary mb-3">7. Children&apos;s Privacy</h2>
                  <p>
                   Our Services are not directed to individuals under the age of 13.
                   We do not knowingly collect personal information from anyone under the age of 13 without the consent of a parent or legal guardian.
                   If we become aware that we have inadvertently collected personal data from a minor without appropriate consent, we will take steps to delete such information promptly.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold text-primary mb-3">8. International Data Transfers</h2>
                  <p>
                    Your information may be transferred to, and processed in, countries other than the country in which you reside. 
                    These countries may have different data protection laws.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold text-primary mb-3">9. Changes to This Privacy Policy</h2>
                  <p>
                    We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
                    the new Privacy Policy on this page and updating the &quot;Effective Date.&quot;
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold text-primary mb-3">10. Contact Us</h2>
                  <p>If you have questions about this Privacy Policy, please contact us at:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Email: adityasinghrajput755@gmail.com</li>
                   
                  </ul>
                </section>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  )
}