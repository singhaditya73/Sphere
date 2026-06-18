"use client";

import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModeToggle } from "@/components/mode-toggle";

export default function TermsOfServicePage() {
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
              width: 80 + ((i * 39) % 250),
              height: 80 + ((i * 41) % 250),
              left: `${(i * 14) % 100}%`,
              top: `${(i * 16) % 100}%`,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 10 + ((i * 6) % 10),
              repeat: Number.POSITIVE_INFINITY,
              delay: (i * 0.7) % 5,
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
                <FileText className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-3xl font-bold">
                Terms of Service
              </CardTitle>
              <p className="text-muted-foreground">
                Last Updated: April 15, 2025
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold text-primary mb-3">
                    1. Introduction
                  </h2>
                  <p>
                    Welcome to Sphere, a decentralized music platform that
                    allows users to vote on songs to be queued and played based
                    on community preferences. These Terms of Service
                    (&quot;Terms&quot;) govern your use of our website, apps,
                    and services (collectively, the &quot;Service&quot;).
                  </p>
                  <p>
                    By accessing or using our Service, you agree to be bound by
                    these Terms. If you disagree with any part of the Terms, you
                    may not access the Service.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold text-primary mb-3">
                    2. Definitions
                  </h2>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>
                      <strong>Platform</strong>: The Sphere decentralized music
                      application and website.
                    </li>
                    <li>
                      <strong>User</strong>: Any individual who accesses or uses
                      the Platform.
                    </li>
                    <li>
                      <strong>Content</strong>: All music, audio, visuals, text,
                      and other materials available through the Platform.
                    </li>
                    <li>
                      <strong>Voting</strong>: The process of users upvoting
                      songs to determine play queue order.
                    </li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold text-primary mb-3">
                    3. Account Registration and Requirements
                  </h2>

                  <div className="mb-4">
                    <h3 className="text-xl font-medium mb-2">
                      3.1 Account Creation
                    </h3>
                    <p>
                      To use certain features of the Service, you must create an
                      account. You agree to provide accurate, current, and
                      complete information and to update this information to
                      keep it accurate, current, and complete.
                    </p>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-xl font-medium mb-2">
                      3.2 Account Security
                    </h3>
                    <p>
                      You are responsible for maintaining the confidentiality of
                      your account credentials and for all activities that occur
                      under your account. You must immediately notify us of any
                      unauthorized use of your account.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-medium mb-2">
                      3.3 Age Requirements
                    </h3>
                    <p>
                      You must be at least 18 years old or the age of legal
                      majority in your jurisdiction to create an account. Users
                      between 13 and 18 years old may use the Service with
                      parental or guardian consent.
                    </p>
                  </div>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold text-primary mb-3">
                    4. Voting and Music Queue System
                  </h2>

                  <div className="mb-4">
                    <h3 className="text-xl font-medium mb-2">
                      4.1 Voting Mechanism
                    </h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>
                        Users can upvote songs to determine their position in
                        the play queue.
                      </li>
                      <li>
                        The Platform uses algorithms to rank and queue songs
                        based on vote counts and other factors.
                      </li>
                      <li>
                        We reserve the right to modify the voting and queuing
                        algorithms at any time.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-medium mb-2">4.2 Fair Use</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>
                        Manipulating the voting system through multiple
                        accounts, bots, or other artificial methods is
                        prohibited.
                      </li>
                      <li>
                        We reserve the right to remove votes or take action
                        against accounts that appear to be engaging in vote
                        manipulation.
                      </li>
                    </ul>
                  </div>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold text-primary mb-3">
                    5. Intellectual Property Rights
                  </h2>

                  <div className="mb-4">
                    <h3 className="text-xl font-medium mb-2">
                      5.1 Music Rights
                    </h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>
                        We do not claim ownership of the music played on the
                        Platform.
                      </li>
                      <li>
                        The Platform connects to licensed music providers or
                        uses properly licensed content.
                      </li>
                      <li>
                        Users may not upload or stream copyrighted content
                        unless they own the rights or have permission.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-medium mb-2">
                      5.2 Platform Content
                    </h3>
                    <p>
                      The Service and its original content, features, and
                      functionality are owned by Sphere and are protected by
                      international copyright, trademark, patent, trade secret,
                      and other intellectual property laws.
                    </p>
                  </div>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold text-primary mb-3">
                    6. User Conduct
                  </h2>
                  <p>When using our Service, you agree not to:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>
                      Use the Service in any way that violates any applicable
                      laws or regulations
                    </li>
                    <li>
                      Interfere with or disrupt the integrity or performance of
                      the Service
                    </li>
                    <li>
                      Attempt to gain unauthorized access to the Service or
                      related systems
                    </li>
                    <li>
                      Engage in vote manipulation or create multiple accounts
                      for this purpose
                    </li>
                    <li>Post or transmit harmful code or malware</li>
                    <li>Harass, abuse, or harm other users</li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold text-primary mb-3">
                    7. Termination
                  </h2>
                  <p>
                    We may terminate or suspend your account and access to the
                    Service immediately, without prior notice or liability, for
                    any reason, including, but not limited to, if you breach
                    these Terms.
                  </p>
                  <p>
                    Upon termination, your right to use the Service will
                    immediately cease. If you wish to terminate your account,
                    you may simply discontinue using the Service or delete your
                    account.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold text-primary mb-3">
                    8. Disclaimer of Warranties
                  </h2>
                  <p>
                    The Service is provided on an &quot;AS IS&quot; and &quot;AS
                    AVAILABLE&quot; basis. We do not warrant that the Service
                    will be uninterrupted, timely, secure, or error-free. We
                    make no warranties regarding the accuracy, reliability, or
                    quality of any content obtained through the Service.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold text-primary mb-3">
                    9. Limitation of Liability
                  </h2>
                  <p>
                    In no event shall Sphere, its directors, employees,
                    partners, agents, suppliers, or affiliates be liable for any
                    indirect, incidental, special, consequential, or punitive
                    damages, including without limitation, loss of profits,
                    data, use, goodwill, or other intangible losses.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold text-primary mb-3">
                    10. Changes to These Terms
                  </h2>
                  <p>
                    We may update these Terms from time to time. We will notify
                    you of any changes by posting the new Terms on this page and
                    updating the &ldquo;Effective Date&rdquo; at the top.
                  </p>
                  <p>
                    It is your responsibility to review these Terms
                    periodically. Your continued use of the Platform following
                    the posting of revised Terms means that you accept and agree
                    to the changes.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold text-primary mb-3">
                    11. Governing Law
                  </h2>
                  <p>
                  These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold text-primary mb-3">
                    12. Contact Us
                  </h2>
                  <p>
                    If you have any questions about these Terms, please contact
                    us at:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Email:   adityasinghrajput755@gmail.com</li>
                  </ul>
                </section>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
