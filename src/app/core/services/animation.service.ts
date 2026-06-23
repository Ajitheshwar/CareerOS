import { Injectable, inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Injectable({
  providedIn: 'root'
})
export class AnimationService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser: boolean;

  // Track active timelines and triggers for cleanup
  private readonly activeTimelines: gsap.core.Timeline[] = [];
  private readonly activeTriggers: ScrollTrigger[] = [];

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    if (this.isBrowser) {
      // Register ScrollTrigger plugin with GSAP
      gsap.registerPlugin(ScrollTrigger);
    }
  }

  /**
   * Safe access check for browser environments (essential for animations)
   */
  public getIsBrowser(): boolean {
    return this.isBrowser;
  }

  /**
   * Create a standard GSAP timeline with automatic tracking and cleanup
   * @param vars Optional timeline configuration
   */
  public createTimeline(vars?: gsap.TimelineVars): gsap.core.Timeline | null {
    if (!this.isBrowser) return null;

    const timeline = gsap.timeline(vars);
    this.activeTimelines.push(timeline);
    return timeline;
  }

  /**
   * Create an animation driven by scroll position using GSAP ScrollTrigger
   * @param vars ScrollTrigger configuration
   */
  public createScrollTrigger(vars: ScrollTrigger.StaticVars): ScrollTrigger | null {
    if (!this.isBrowser) return null;

    const trigger = ScrollTrigger.create(vars);
    this.activeTriggers.push(trigger);
    return trigger;
  }

  /**
   * Animate an element from starting properties to current properties
   */
  public from(target: gsap.DOMTarget, vars: gsap.TweenVars): gsap.core.Tween | null {
    if (!this.isBrowser) return null;
    return gsap.from(target, vars);
  }

  /**
   * Animate an element from current properties to ending properties
   */
  public to(target: gsap.DOMTarget, vars: gsap.TweenVars): gsap.core.Tween | null {
    if (!this.isBrowser) return null;
    return gsap.to(target, vars);
  }

  /**
   * Set properties of target elements immediately without animating
   */
  public set(target: gsap.DOMTarget, vars: gsap.TweenVars): void {
    if (!this.isBrowser) return;
    gsap.set(target, vars);
  }

  /**
   * Clean up all tracked tweens, timelines, and ScrollTriggers.
   * Useful when components are destroyed or navigation occurs.
   */
  public cleanup(): void {
    if (!this.isBrowser) return;

    // Kill all registered ScrollTriggers
    this.activeTriggers.forEach(trigger => {
      trigger.kill();
    });
    this.activeTriggers.length = 0;

    // Kill all registered Timelines
    this.activeTimelines.forEach(timeline => {
      timeline.kill();
    });
    this.activeTimelines.length = 0;
  }

  ngOnDestroy(): void {
    this.cleanup();
  }
}
