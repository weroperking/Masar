import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, Sparkles, CheckCircle2 } from 'lucide-react';
import { toMajorUnits } from '../utils/currency';

export interface PennyDropEventDetail {
  amountMinor: number;
  studentName?: string;
  courseName?: string;
  type?: 'subscription' | 'session' | 'quick_settle';
}

// Restores the soft synthetic coin chime sound when triggered
export function triggerPennyDrop(_detail: PennyDropEventDetail) {
  if (typeof window !== 'undefined') {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const now = ctx.currentTime;
        
        // Two consecutive soft sine tones simulating coin drop clink
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(987.77, now + 0.1); // B5
        osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.22); // E6
        gain1.gain.setValueAtTime(0.06, now + 0.1);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now + 0.1);
        osc1.stop(now + 0.35);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1318.51, now + 0.22); // E6
        osc2.frequency.exponentialRampToValueAtTime(1760.00, now + 0.42); // A6
        gain2.gain.setValueAtTime(0.08, now + 0.22);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.22);
        osc2.stop(now + 0.55);
      }
    } catch {
      // Audio context is optional
    }
  }
}

export function PennyDropAnimation() {
  return null;
}
