# Security Protection Layers

## Overview
This document outlines the comprehensive multi-layered security approach implemented to prevent document extraction via DevTools or DOM manipulation.

## Defense Strategy: Defense in Depth
Multiple redundant security layers ensure that even if an attacker bypasses one protection, several others remain active.

---

## Layer 1: Prevention - Block DevTools from Opening

### Right-Click Blocking
- **Location**: `src/lib/security/screen.ts` - `handleContextMenu()`
- **Function**: Prevents context menu (right-click) from opening
- **Effect**: Blocks "Inspect Element" option
- **Violation**: Triggers `POLICY_BREACH` with reason `right_click_blocked`

### Keyboard Shortcut Blocking
- **Location**: `src/lib/security/screen.ts` - `handleKeydown()`
- **Blocked Keys**:
  - `F12` - DevTools toggle
  - `Ctrl+Shift+I` / `Cmd+Option+I` - DevTools
  - `Ctrl+Shift+C` / `Cmd+Option+C` - Inspect Element
  - `Ctrl+Shift+J` / `Cmd+Option+J` - Console
- **Effect**: All common DevTools shortcuts are intercepted and blocked
- **Violation**: Triggers `DEVTOOLS_ATTEMPT` with key information

---

## Layer 2: Detection - Detect if DevTools Opens

### Pre-Load Check
- **Location**: `src/components/security/SecureViewerShell.tsx` - Initial useEffect
- **Method**: Window dimension gap detection (200px threshold)
- **Effect**: If DevTools is open BEFORE document loads, shows blocking screen
- **Message**: "This secure document cannot be accessed while browser developer tools are open"

### Runtime Detection (Triple Method)
- **Location**: `src/lib/security/screen.ts` - `detectDevTools()`
- **Methods**:
  1. **Window Dimension Gap (200px)**: `widthGap > 200 || heightGap > 200`
  2. **Alternative Threshold (160px)**: Backup detection method
  3. **Debugger Timing Attack**: `debugger` statement takes >100ms when DevTools open
- **Frequency**: Checked every 100ms
- **Effect**: Immediate session termination if detected

---

## Layer 3: Termination - Kill Session if DevTools Detected

### Aggressive Response
- **Location**: `src/lib/security/screen.ts` - `detectDevTools()`
- **Actions**:
  1. Replace entire `document.body.innerHTML` with security violation message
  2. Force page reload via `window.location.reload()`
- **Message**: "Security Violation - Developer tools detected. Session terminated."
- **Effect**: Complete DOM destruction, no recovery possible

---

## Layer 4: DOM Mutation Monitoring

### MutationObserver Protection
- **Location**: `src/components/security/SecureViewerShell.tsx` - DOM monitoring useEffect
- **Monitors**:
  - **childList**: Detects removal of security elements
  - **attributes**: Detects style changes (display: none, visibility: hidden)
  - **subtree**: Monitors entire DOM tree
- **Protected Elements**: All elements with `data-security-overlay` attribute
- **Response**: Immediate session kill if security elements are tampered with

### Periodic Verification
- **Frequency**: Every 1000ms
- **Check**: Verifies `data-security-overlay` elements exist when camera obstructed
- **Response**: Session kill if security elements missing

---

## Layer 5: Content Interaction Blocking

### Document-Level Event Prevention
- **Location**: `src/components/security/DocumentViewport.tsx` - useEffect
- **Blocked Events**:
  - `selectstart` - Text selection disabled
  - `dragstart` - Drag operations disabled
  - `copy` - Copy operations disabled

### Inline Event Handlers
- **Location**: `src/components/security/DocumentViewport.tsx` - article element
- **Handlers**:
  - `onContextMenu` - Right-click blocked
  - `onCopy` - Copy disabled
  - `onCut` - Cut disabled
  - `onPaste` - Paste disabled
  - `onDragStart` - Drag disabled
  - `onDrop` - Drop disabled

---

## Layer 6: CSS-Based Protection

### User Selection Blocking
- **Location**: `src/components/security/DocumentViewport.tsx` - article style
- **CSS Properties**:
  ```css
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -moz-user-select: none;
  -ms-user-select: none;
  ```
- **Effect**: Text cannot be selected with mouse or keyboard

---

## Layer 7: DOM Structure Obfuscation

### Protected Content Wrappers
- **Location**: `src/components/security/DocumentViewport.tsx`
- **Structure**:
  ```tsx
  <div data-protected="true" style={{ position: 'relative', isolation: 'isolate' }}>
    {/* Content */}
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }} aria-hidden="true" />
  </div>
  ```
- **Elements Protected**:
  - File viewer content (SecureFileViewer)
  - Rich text content (dangerouslySetInnerHTML)
- **Effect**: Content wrapped in isolated containers with invisible overlay layers

### Isolation
- **CSS Property**: `isolation: isolate`
- **Effect**: Creates new stacking context, making DOM inspection more difficult

---

## Layer 8: Camera Obstruction Overlay

### Black Screen Enforcement
- **Location**: `src/components/security/SecureViewerShell.tsx`
- **Trigger**: `cameraObstructed === true` (obstructionScore > 0.4)
- **Implementation**:
  ```tsx
  <div 
    className="pointer-events-none absolute inset-0 z-25 bg-black"
    data-security-overlay="camera-obstruction"
  >
  ```
- **Z-Index**: 25 (above document content)
- **Protection**: Monitored by MutationObserver for tampering attempts

---

## Attack Scenarios & Defenses

### Scenario 1: User Right-Clicks to Inspect Element
- ❌ **Blocked**: Layer 1 (handleContextMenu) prevents context menu
- ✅ **Violation Logged**: POLICY_BREACH recorded

### Scenario 2: User Presses F12
- ❌ **Blocked**: Layer 1 (handleKeydown) intercepts F12
- ✅ **Violation Logged**: DEVTOOLS_ATTEMPT recorded

### Scenario 3: User Opens DevTools Before Loading Document
- ❌ **Blocked**: Layer 2 (Pre-load check) detects DevTools
- ✅ **Blocking Screen**: Document never loads

### Scenario 4: User Opens DevTools After Document Loads
- ❌ **Detected**: Layer 2 (Runtime detection, 3 methods)
- ✅ **Session Killed**: Layer 3 (DOM destruction + reload)

### Scenario 5: User Uses DevTools to Remove Black Overlay
- ❌ **Detected**: Layer 4 (MutationObserver) detects removal
- ✅ **Session Killed**: Immediate termination

### Scenario 6: User Changes Overlay Style to display:none
- ❌ **Detected**: Layer 4 (MutationObserver) detects style change
- ✅ **Session Killed**: Immediate termination

### Scenario 7: User Tries to Select and Copy Text
- ❌ **Blocked**: Layers 5 & 6 (Event handlers + CSS user-select)
- ✅ **No Selection**: Text cannot be selected

### Scenario 8: User Attempts Drag-and-Drop
- ❌ **Blocked**: Layer 5 (dragstart, drop event handlers)

---

## Testing Checklist

### Manual Tests
- [ ] Right-click on document → Should be blocked
- [ ] Press F12 → Should be blocked
- [ ] Press Ctrl+Shift+I → Should be blocked
- [ ] Press Ctrl+Shift+C → Should be blocked
- [ ] Open DevTools before accessing document → Should show blocking screen
- [ ] Open DevTools after document loads → Session should be killed immediately
- [ ] Try to select text → Should be disabled
- [ ] Try to copy text (Ctrl+C) → Should be blocked
- [ ] Cover camera → Black screen appears
- [ ] Use DevTools to remove black screen → Session killed
- [ ] Use DevTools to set black screen display:none → Session killed
- [ ] Try to drag content → Should be blocked

### Browser Tests
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if applicable)

---

## Known Limitations

1. **Determined Attackers**: No client-side security is 100% foolproof. These layers significantly raise the difficulty bar but cannot prevent all attacks by highly sophisticated attackers.

2. **Browser Extensions**: Some browser extensions may interfere with detection mechanisms.

3. **Screen Recording**: While DevTools inspection is blocked, screen recording software can still capture visible content.

4. **Memory Inspection**: Advanced attackers could potentially dump browser memory.

---

## Future Enhancements

1. **Shadow DOM**: Implement Shadow DOM for even stronger DOM isolation
2. **Content Obfuscation**: Scramble content in DOM and decode on render
3. **Server-Side Monitoring**: Enhanced backend monitoring of violation patterns
4. **Rate Limiting**: Limit violation attempts to detect persistent attackers
5. **Advanced Detection**: Console log timing, iframe detection, network monitoring
6. **DRM-like Protections**: Explore Encrypted Media Extensions (EME) for video content

---

## Summary

The security model implements **8 layers of protection** with **4 lines of defense**:

1. **Prevention**: Block DevTools from opening (Layers 1)
2. **Detection**: Detect if DevTools opens anyway (Layer 2)
3. **Termination**: Kill session immediately (Layer 3)
4. **Hardening**: Make content extraction difficult even if DevTools opens (Layers 4-8)

This multi-layered approach ensures that even if one layer is bypassed, multiple fallback protections remain active.
