declare namespace JSX {
  interface IntrinsicElements {
    'elevenlabs-convai': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        'agent-id'?: string;
        variant?: 'expandable' | 'expanded' | 'compact';
        'avatar-image-url'?: string;
        'action-text'?: string;
      },
      HTMLElement
    >;
  }
}
