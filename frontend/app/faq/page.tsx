"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface FAQItem {
  question: string;
  answer: string | JSX.Element;
}

interface FAQSection {
  title: string;
  icon: string;
  items: FAQItem[];
}

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  const toggleQuestion = (sectionIndex: number, itemIndex: number) => {
    const key = `${sectionIndex}-${itemIndex}`;
    setOpenIndex(openIndex === key ? null : key);
  };

  const faqSections: FAQSection[] = [
    {
      title: "Getting Started",
      icon: "🚀",
      items: [
        {
          question: "What is Gonado?",
          answer: (
            <div className="space-y-2">
              <p>Gonado is a goal achievement platform that helps you turn your dreams into reality through:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Visual Quest Maps:</strong> Break down your goals into manageable steps</li>
                <li><strong>Community Support:</strong> Get encouragement and help from fellow achievers</li>
                <li><strong>Gamification:</strong> Earn XP, maintain streaks, and unlock achievements</li>
                <li><strong>AI-Powered Planning:</strong> Get smart suggestions for your goal steps</li>
              </ul>
              <p className="mt-2">Whether you're learning a new skill, getting fit, building a career, or pursuing any personal goal, Gonado provides the structure and support you need to succeed.</p>
            </div>
          ),
        },
        {
          question: "How do I create my first goal?",
          answer: (
            <div className="space-y-2">
              <p><strong>Step-by-step guide:</strong></p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li><strong>Sign up or log in</strong> to your account</li>
                <li><strong>Click "Create New Goal"</strong> from your dashboard</li>
                <li><strong>Fill in the details:</strong>
                  <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                    <li>Title: Give your goal a clear, inspiring name</li>
                    <li>Description: Explain what you want to achieve and why</li>
                    <li>Category: Choose from Fitness, Learning, Career, Creative, Financial, or Personal</li>
                    <li>Target Date: Set a realistic deadline</li>
                    <li>Visibility: Choose Public (shareable) or Private (just for you)</li>
                  </ul>
                </li>
                <li><strong>Add Quest Nodes:</strong> Break your goal into actionable steps</li>
                <li><strong>Save and start!</strong> Your quest map is ready to begin</li>
              </ol>
            </div>
          ),
        },
      ],
    },
    {
      title: "Quest Nodes",
      icon: "🗺️",
      items: [
        {
          question: "What are Quest Nodes?",
          answer: (
            <div className="space-y-2">
              <p>Quest Nodes are the individual steps or milestones that make up your goal. Think of them as checkpoints on your journey:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Breakdown:</strong> Large goals become manageable tasks</li>
                <li><strong>Visual Map:</strong> See your entire journey at a glance</li>
                <li><strong>Progress Tracking:</strong> Mark nodes as complete to track advancement</li>
                <li><strong>Difficulty Levels:</strong> Easy, Medium, Hard, Very Hard (affects XP rewards)</li>
                <li><strong>Dependencies:</strong> Set nodes that must be completed before others (sequential)</li>
                <li><strong>Parallel Paths:</strong> Work on multiple nodes simultaneously</li>
              </ul>
              <p className="mt-2"><strong>Example:</strong> For a "Learn Spanish" goal, nodes might be: "Complete Duolingo basics", "Watch 5 Spanish movies", "Have first conversation", etc.</p>
            </div>
          ),
        },
        {
          question: "How do I organize my Quest Nodes?",
          answer: (
            <div className="space-y-2">
              <p>You have full control over your quest map layout:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Drag & Drop:</strong> Click and drag nodes to arrange them visually</li>
                <li><strong>Sequential Flow:</strong> Set dependencies so nodes unlock after others complete</li>
                <li><strong>Parallel Branches:</strong> Create multiple paths for complex goals</li>
                <li><strong>Add/Edit/Delete:</strong> Modify nodes anytime as your plan evolves</li>
                <li><strong>Difficulty Settings:</strong> Assign difficulty to each node for appropriate XP rewards</li>
              </ul>
              <p className="mt-2">Your layout is automatically saved and visible to anyone you share your goal with.</p>
            </div>
          ),
        },
      ],
    },
    {
      title: "Sharing & Social",
      icon: "🌍",
      items: [
        {
          question: "How do I share my goals?",
          answer: (
            <div className="space-y-2">
              <p><strong>Visibility Settings:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Private:</strong> Only you can see your goal (default)</li>
                <li><strong>Public:</strong> Anyone can view, react, and comment on your goal</li>
              </ul>
              <p className="mt-2"><strong>To share publicly:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Edit your goal settings</li>
                <li>Change visibility to "Public"</li>
                <li>Your goal appears in the Discover feed</li>
                <li>Copy the direct link to share on social media</li>
              </ol>
              <p className="mt-2"><strong>Note:</strong> You can switch between public and private anytime.</p>
            </div>
          ),
        },
        {
          question: "How can I support others?",
          answer: (
            <div className="space-y-2">
              <p>There are many ways to help fellow achievers:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Reactions:</strong> Quick emoji support on goals and nodes (earns them +2 XP)</li>
                <li><strong>Comments:</strong> Share encouragement, advice, or resources (earns them +5 XP)</li>
                <li><strong>Follow:</strong> Stay updated on their progress</li>
                <li><strong>Sacred Boost:</strong> Send premium motivational support</li>
                <li><strong>Swaps:</strong> Propose mutual help exchanges</li>
                <li><strong>Resource Drops:</strong> Share helpful links, tips, or tools</li>
              </ul>
              <p className="mt-2">Supporting others also earns YOU XP and builds your reputation in the community!</p>
            </div>
          ),
        },
        {
          question: "What are Fellow Travelers?",
          answer: (
            <div className="space-y-2">
              <p>Fellow Travelers are other users working on similar goals who appear on your quest map:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Discovery:</strong> Find others on similar journeys</li>
                <li><strong>Map View:</strong> See their avatars on the shared quest path</li>
                <li><strong>Connect:</strong> Follow, message, or collaborate</li>
                <li><strong>Motivation:</strong> You're not alone in your journey!</li>
              </ul>
            </div>
          ),
        },
      ],
    },
    {
      title: "Gamification & Rewards",
      icon: "⭐",
      items: [
        {
          question: "How does XP and leveling work?",
          answer: (
            <div className="space-y-2">
              <p><strong>Earn XP through:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Complete Nodes:</strong> 10-50 XP based on difficulty
                  <ul className="list-disc list-inside ml-6 mt-1 text-sm text-gray-400">
                    <li>Easy: 10 XP</li>
                    <li>Medium: 20 XP</li>
                    <li>Hard: 35 XP</li>
                    <li>Very Hard: 50 XP</li>
                  </ul>
                </li>
                <li><strong>Receive Reactions:</strong> +2 XP per reaction</li>
                <li><strong>Receive Comments:</strong> +5 XP per comment</li>
                <li><strong>Give Boosts:</strong> +10 XP (supporting others rewards you too!)</li>
                <li><strong>Maintain Streaks:</strong> Bonus XP multiplier for consecutive days</li>
              </ul>
              <p className="mt-2"><strong>Leveling:</strong> XP accumulates to increase your level, unlocking special badges and features!</p>
            </div>
          ),
        },
        {
          question: "What are streaks and how do they work?",
          answer: (
            <div className="space-y-2">
              <p>Streaks track your consistency by counting consecutive days of activity:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Daily Activity:</strong> Complete at least one node per day</li>
                <li><strong>Streak Counter:</strong> Visible on your dashboard and profile</li>
                <li><strong>XP Multiplier:</strong> Longer streaks = higher XP bonuses</li>
                <li><strong>Motivation:</strong> Don't break the chain!</li>
              </ul>
              <p className="mt-2"><strong>Tip:</strong> Set up small, achievable daily nodes to maintain your streak even on busy days.</p>
            </div>
          ),
        },
        {
          question: "What badges can I earn?",
          answer: (
            <div className="space-y-2">
              <p>Badges are earned through various achievements:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Goal Milestones:</strong> Complete your first goal, 5 goals, 10 goals, etc.</li>
                <li><strong>Streak Achievements:</strong> 7-day, 30-day, 100-day streaks</li>
                <li><strong>Community Support:</strong> Help 10, 50, 100 fellow achievers</li>
                <li><strong>XP Levels:</strong> Reach level 5, 10, 25, 50, etc.</li>
                <li><strong>Special Categories:</strong> Domain-specific badges for different goal types</li>
              </ul>
              <p className="mt-2">Badges are displayed on your profile and show your expertise to the community!</p>
            </div>
          ),
        },
      ],
    },
    {
      title: "Advanced Features",
      icon: "💎",
      items: [
        {
          question: "What are Time Capsules?",
          answer: (
            <div className="space-y-2">
              <p>Time Capsules let you send messages to your future self:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Create:</strong> Write a message to yourself at any point in your journey</li>
                <li><strong>Schedule:</strong> Set when you want to receive it (specific date or upon goal completion)</li>
                <li><strong>Reflect:</strong> Compare your past expectations with current reality</li>
                <li><strong>Motivate:</strong> Remind yourself why you started</li>
              </ul>
              <p className="mt-2"><strong>Example:</strong> "To me when I complete this goal: Remember when you thought this was impossible? You did it!"</p>
            </div>
          ),
        },
        {
          question: "How do Swaps work?",
          answer: (
            <div className="space-y-2">
              <p>Swaps are mutual support exchanges between achievers:</p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li><strong>Propose:</strong> Find someone whose goal you can help with</li>
                <li><strong>Offer:</strong> "I'll help you with [your node] if you help me with [my node]"</li>
                <li><strong>Accept/Decline:</strong> They review and respond to your proposal</li>
                <li><strong>Collaborate:</strong> If accepted, you both become mutual supporters</li>
                <li><strong>Track:</strong> See your active swaps and fulfill your commitments</li>
              </ol>
              <p className="mt-2"><strong>Benefits:</strong> Get expert help while building your reputation and helping others!</p>
            </div>
          ),
        },
        {
          question: "What is Struggle Detection?",
          answer: (
            <div className="space-y-2">
              <p>Gonado automatically detects when you might be struggling and offers help:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Pattern Recognition:</strong> Identifies stalled progress, repeated failures, or long gaps</li>
                <li><strong>Coaching Suggestions:</strong> Offers tips, resources, or strategy adjustments</li>
                <li><strong>Community Connection:</strong> Suggests relevant supporters or swap opportunities</li>
                <li><strong>Gentle Nudges:</strong> Motivational reminders without pressure</li>
              </ul>
              <p className="mt-2">We're here to help you succeed, not judge your setbacks!</p>
            </div>
          ),
        },
      ],
    },
    {
      title: "Privacy & Data",
      icon: "🔒",
      items: [
        {
          question: "What data do you collect?",
          answer: (
            <div className="space-y-2">
              <p><strong>We collect only what's necessary:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Account Info:</strong> Email, username, display name</li>
                <li><strong>Goal Data:</strong> Your goals, nodes, progress, and settings</li>
                <li><strong>Social Activity:</strong> Reactions, comments, follows, swaps</li>
                <li><strong>Gamification:</strong> XP, levels, streaks, badges</li>
                <li><strong>Usage Analytics:</strong> Anonymous usage patterns to improve the platform</li>
              </ul>
              <p className="mt-2"><strong>We DO NOT:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Sell your data to third parties</li>
                <li>Share your private goals without permission</li>
                <li>Track you outside the platform</li>
                <li>Use your content for AI training without consent</li>
              </ul>
            </div>
          ),
        },
        {
          question: "Can I delete my data?",
          answer: (
            <div className="space-y-2">
              <p><strong>You have full control over your data:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Delete Individual Goals:</strong> Anytime from your dashboard</li>
                <li><strong>Delete Comments/Reactions:</strong> Remove your own contributions</li>
                <li><strong>Delete Account:</strong> Complete data deletion available in settings</li>
                <li><strong>Export Data:</strong> Download all your data before deleting</li>
              </ul>
              <p className="mt-2"><strong>Note:</strong> Account deletion is permanent and cannot be undone. Deleted goals and nodes are removed immediately.</p>
            </div>
          ),
        },
        {
          question: "How do privacy settings work?",
          answer: (
            <div className="space-y-2">
              <p><strong>Per-Goal Privacy Controls:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Private:</strong> Only you can see (default)</li>
                <li><strong>Public:</strong> Visible in Discover feed, shareable link</li>
              </ul>
              <p className="mt-2"><strong>Additional Controls:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Profile Visibility:</strong> Control what appears on your public profile</li>
                <li><strong>Notification Settings:</strong> Choose what alerts you receive</li>
                <li><strong>Blocked Users:</strong> Prevent specific users from seeing or interacting with your content</li>
              </ul>
            </div>
          ),
        },
      ],
    },
    {
      title: "Support & Contact",
      icon: "💬",
      items: [
        {
          question: "How do I get help?",
          answer: (
            <div className="space-y-2">
              <p><strong>Multiple support channels:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>In-App Help:</strong> Click the "?" icon in the navigation</li>
                <li><strong>Community Forum:</strong> Ask questions and share tips with other users</li>
                <li><strong>Email Support:</strong> support@gonado.com</li>
                <li><strong>Bug Reports:</strong> Use the "Report Issue" button in settings</li>
                <li><strong>Feature Requests:</strong> Share ideas through our feedback form</li>
              </ul>
              <p className="mt-2">We typically respond within 24-48 hours on business days.</p>
            </div>
          ),
        },
        {
          question: "How do I report inappropriate content?",
          answer: (
            <div className="space-y-2">
              <p><strong>We take community safety seriously:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Report Button:</strong> Click the flag icon on any goal, comment, or profile</li>
                <li><strong>Categories:</strong> Spam, harassment, inappropriate content, impersonation</li>
                <li><strong>Review:</strong> Our team reviews all reports within 24 hours</li>
                <li><strong>Action:</strong> Violations result in warnings, content removal, or account suspension</li>
                <li><strong>Appeal:</strong> Users can appeal moderation decisions</li>
              </ul>
              <p className="mt-2">Reports are confidential - the reported user won't know who reported them.</p>
            </div>
          ),
        },
        {
          question: "Is Gonado free?",
          answer: (
            <div className="space-y-2">
              <p><strong>Yes! Core features are completely free:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Unlimited goals and nodes</li>
                <li>Full quest map visualization</li>
                <li>Community features (reactions, comments, follows)</li>
                <li>XP, levels, streaks, and badges</li>
                <li>Time capsules and swaps</li>
              </ul>
              <p className="mt-2"><strong>Premium features (coming soon):</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Advanced AI coaching</li>
                <li>Priority support</li>
                <li>Custom themes and layouts</li>
                <li>Extended analytics</li>
              </ul>
              <p className="mt-2">We'll always keep core goal tracking free for everyone.</p>
            </div>
          ),
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto mb-12"
      >
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              ← Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Everything you need to know about using Gonado to achieve your goals
          </p>
        </div>
      </motion.div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-4xl mx-auto mb-12"
      >
        <Card variant="glass">
          <h2 className="text-lg font-semibold text-white mb-4">Jump to Section</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {faqSections.map((section, index) => (
              <a
                key={index}
                href={`#section-${index}`}
                className="flex items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm text-gray-300 hover:text-white"
              >
                <span className="text-xl">{section.icon}</span>
                <span>{section.title}</span>
              </a>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* FAQ Sections */}
      <div className="max-w-4xl mx-auto space-y-8">
        {faqSections.map((section, sectionIndex) => (
          <motion.section
            key={sectionIndex}
            id={`section-${sectionIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * (sectionIndex + 1) }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{section.icon}</span>
              <h2 className="text-2xl font-bold text-white">{section.title}</h2>
            </div>

            <div className="space-y-3">
              {section.items.map((item, itemIndex) => {
                const key = `${sectionIndex}-${itemIndex}`;
                const isOpen = openIndex === key;

                return (
                  <Card key={itemIndex} variant="glass">
                    <button
                      onClick={() => toggleQuestion(sectionIndex, itemIndex)}
                      className="w-full text-left flex items-start justify-between gap-4 group"
                    >
                      <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors">
                        {item.question}
                      </h3>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-shrink-0 mt-1"
                      >
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 text-gray-300 leading-relaxed">
                            {typeof item.answer === "string" ? (
                              <p>{item.answer}</p>
                            ) : (
                              item.answer
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                );
              })}
            </div>
          </motion.section>
        ))}
      </div>

      {/* Footer CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="max-w-4xl mx-auto mt-16 mb-8"
      >
        <Card variant="glass" className="text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            Still have questions?
          </h2>
          <p className="text-gray-400 mb-6">
            We're here to help! Reach out to our support team.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button onClick={() => window.location.href = "mailto:support@gonado.com"}>
              Contact Support
            </Button>
            <Link href="/dashboard">
              <Button variant="secondary">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
