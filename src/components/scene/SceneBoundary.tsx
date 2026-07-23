'use client';
import { Component, ReactNode } from 'react';
import Image from 'next/image';

/**
 * Error boundary around the WebGL scene — a lost context or shader failure falls
 * back to a static poster instead of a black screen, and the rest of the site
 * (DOM content, links) keeps working.
 */
export default class SceneBoundary extends Component<{ children: ReactNode; poster: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="fixed inset-0" style={{ zIndex: 0 }} aria-hidden="true">
          <Image src={this.props.poster} alt="" fill priority unoptimized className="object-cover" />
          <div className="absolute inset-0" style={{ background: 'rgba(5,7,20,0.55)' }} />
        </div>
      );
    }
    return this.props.children;
  }
}
