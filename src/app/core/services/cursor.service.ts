import { Injectable, signal, OnDestroy } from '@angular/core';

export type CursorState = 'DEFAULT' | 'HOVER' | 'CLICK' | 'DRAG' | 'LOADING' | 'PRECISION' | 'LINK' | 'DISABLED';

@Injectable({
  providedIn: 'root'
})
export class CursorService implements OnDestroy {
  // Signals for state binding
  public readonly state = signal<CursorState>('DEFAULT');
  public readonly themeColor = signal<string>('#00E5FF'); // default cyan
  public readonly mouseX = signal<number>(0);
  public readonly mouseY = signal<number>(0);
  public readonly snapCoords = signal<{ x: number; y: number } | null>(null);
  public readonly isScrolling = signal<boolean>(false);

  private scrollTimeoutId: any = null;
  private isMouseDown = false;
  private startDragX = 0;
  private startDragY = 0;

  constructor() {
    this.initListeners();
  }

  private initListeners(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    window.addEventListener('mousemove', this.onMouseMove, { passive: true });
    window.addEventListener('mousedown', this.onMouseDown, { passive: true });
    window.addEventListener('mouseup', this.onMouseUp, { passive: true });
    document.addEventListener('mouseover', this.onMouseOver, { passive: true });
    document.addEventListener('mouseout', this.onMouseOut, { passive: true });
    window.addEventListener('scroll', this.onScroll, { passive: true });
  }

  private readonly onMouseMove = (e: MouseEvent): void => {
    this.mouseX.set(e.clientX);
    this.mouseY.set(e.clientY);

    // If mouse button is held, check if dragging distance is crossed to switch to DRAG state
    if (this.isMouseDown && this.state() !== 'DRAG') {
      const dx = e.clientX - this.startDragX;
      const dy = e.clientY - this.startDragY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 6) {
        this.state.set('DRAG');
      }
    }
  };

  private readonly onMouseDown = (e: MouseEvent): void => {
    this.isMouseDown = true;
    this.startDragX = e.clientX;
    this.startDragY = e.clientY;
    
    // Set click state on mousedown (if not disabled)
    if (this.state() !== 'DISABLED') {
      this.state.set('CLICK');
    }
  };

  private readonly onMouseUp = (e: MouseEvent): void => {
    this.isMouseDown = false;
    
    // Scan element currently under mouse to restore appropriate hover state
    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
    if (target) {
      this.handleMouseOver(target);
  } else {
      this.state.set('DEFAULT');
      this.themeColor.set('#00E5FF');
      this.snapCoords.set(null);
    }
  };

  private readonly onMouseOver = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    if (target) {
      this.handleMouseOver(target);
    }
  };

  private readonly onMouseOut = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    if (target) {
      this.handleMouseOut(target);
    }
  };

  private readonly onScroll = (): void => {
    this.isScrolling.set(true);

    if (this.scrollTimeoutId) {
      clearTimeout(this.scrollTimeoutId);
    }

    this.scrollTimeoutId = setTimeout(() => {
      this.isScrolling.set(false);
    }, 150);
  };

  private handleMouseOver(target: HTMLElement): void {
    // Find closest interactive component
    const interactive = target.closest('a, button, select, input, textarea, [role="button"], .cursor-pointer, .system-node, .strength-node-pill, .contact-node');
    if (!interactive) {
      // Revert to default unless currently clicking/dragging
      if (!this.isMouseDown) {
        this.state.set('DEFAULT');
        this.themeColor.set('#00E5FF');
        this.snapCoords.set(null);
      }
      return;
    }

    // Check if element is disabled
    if (interactive.hasAttribute('disabled') || interactive.classList.contains('disabled') || interactive.classList.contains('pointer-events-none')) {
      this.state.set('DISABLED');
      this.themeColor.set('#ef4444'); // Red warning color
      this.snapCoords.set(null);
      return;
    }


    // Links / Portals
    if (
      interactive.classList.contains('contact-node') || 
      (interactive.tagName === 'A' && (
        interactive.getAttribute('href')?.startsWith('http') || 
        interactive.getAttribute('href')?.startsWith('mailto') || 
        interactive.getAttribute('href')?.startsWith('tel')
      ))
    ) {
      if (!this.isMouseDown) {
        this.state.set('LINK');
        this.themeColor.set('#fb923c'); // Amber/Orange
        this.snapCoords.set(null);
      }
      return;
    }

    // System Core Nodes (Scene 5)
    if (interactive.classList.contains('system-node')) {
      if (!this.isMouseDown) {
        this.state.set('HOVER');
        const customTheme = window.getComputedStyle(interactive).getPropertyValue('--theme-color')?.trim();
        this.themeColor.set(customTheme || '#00E5FF');
        this.snapCoords.set(null);
      }
      return;
    }

    // Text inputs for Precision State
    if (interactive.tagName === 'INPUT' || interactive.tagName === 'TEXTAREA') {
      const type = (interactive as HTMLInputElement).type;
      const isTextInput = !['button', 'submit', 'radio', 'checkbox', 'file', 'image', 'range'].includes(type);
      if (isTextInput) {
        this.state.set('PRECISION');
        this.themeColor.set('#3B82F6'); // Precision blue
        this.snapCoords.set(null);
        return;
      }
    }

    // Generic Hover (buttons, standard dropdowns, pointer elements)
    if (!this.isMouseDown) {
      this.state.set('HOVER');
      const customTheme = window.getComputedStyle(interactive).getPropertyValue('--theme-color')?.trim();
      this.themeColor.set(customTheme || '#00E5FF');
      this.snapCoords.set(null);
    }
  }

  private handleMouseOut(target: HTMLElement): void {
    const interactive = target.closest('.strength-node-pill, .system-node, .contact-node, a, button, select, input, textarea');
    if (interactive && !this.isMouseDown) {
      this.snapCoords.set(null);
      this.state.set('DEFAULT');
      this.themeColor.set('#00E5FF');
    }
  }

  public setLoadingState(loading: boolean): void {
    if (loading) {
      this.state.set('LOADING');
      this.themeColor.set('#8B5CF6'); // purple loader
    } else {
      this.state.set('DEFAULT');
      this.themeColor.set('#00E5FF');
    }
  }

  ngOnDestroy(): void {
    if (typeof window === 'undefined') return;
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('mouseover', this.onMouseOver);
    document.removeEventListener('mouseout', this.onMouseOut);
    window.removeEventListener('scroll', this.onScroll);
    if (this.scrollTimeoutId) {
      clearTimeout(this.scrollTimeoutId);
    }
  }
}
