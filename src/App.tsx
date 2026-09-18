/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  return (
    <div
      id="welcome-container"
      className="min-h-screen bg-neutral-50 text-neutral-900 flex items-center justify-center p-6 antialiased"
    >
      <motion.div
        id="welcome-card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md bg-white border border-neutral-200/80 rounded-2xl p-8 shadow-sm text-center"
      >
        <div
          id="welcome-icon-badge"
          className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-900 text-white mb-5 shadow-xs"
        >
          <Sparkles className="w-6 h-6" />
        </div>

        <h1
          id="welcome-heading"
          className="text-2xl font-semibold tracking-tight text-neutral-900 mb-2"
        >
          Hello there!
        </h1>

        <p
          id="welcome-description"
          className="text-neutral-600 text-base leading-relaxed mb-6"
        >
          What would you like to build today? Tell me your idea, and I'll create a complete, interactive web app for you.
        </p>

        <div
          id="welcome-prompt-guide"
          className="bg-neutral-50 border border-neutral-200/60 rounded-xl p-4 text-left text-sm text-neutral-600 space-y-2"
        >
          <div className="font-medium text-neutral-800 text-xs uppercase tracking-wider">
            Ideas to try:
          </div>
          <ul className="space-y-1.5 text-neutral-600">
            <li className="flex items-center gap-2">
              <ArrowRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>A task tracker with priority tags & deadlines</span>
            </li>
            <li className="flex items-center gap-2">
              <ArrowRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>An expense split calculator with currency conversion</span>
            </li>
            <li className="flex items-center gap-2">
              <ArrowRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>A customized pomodoro timer with sound cues</span>
            </li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}

