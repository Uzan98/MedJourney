declare module 'react-quill' {
  import { Component } from 'react';

  export interface ReactQuillProps {
    value?: string;
    defaultValue?: string;
    placeholder?: string;
    readOnly?: boolean;
    onChange?: (content: string, delta: any, source: string, editor: any) => void;
    onChangeSelection?: (selection: any, source: string, editor: any) => void;
    onFocus?: (selection: any, source: string, editor: any) => void;
    onBlur?: (previousSelection: any, source: string, editor: any) => void;
    onKeyPress?: (event: any) => void;
    onKeyDown?: (event: any) => void;
    onKeyUp?: (event: any) => void;
    bounds?: string | HTMLElement;
    children?: React.ReactNode;
    className?: string;
    formats?: string[];
    modules?: any;
    preserveWhitespace?: boolean;
    style?: React.CSSProperties;
    tabIndex?: number;
    theme?: string;
    scrollingContainer?: string | HTMLElement;
  }

  export default class ReactQuill extends Component<ReactQuillProps> {}
}

declare module 'quill' {
  export default class Quill {
    constructor(container: string | Element, options?: any);
    deleteText(index: number, length: number, source?: string): void;
    disable(): void;
    enable(enabled?: boolean): void;
    getContents(index?: number, length?: number): any;
    getLength(): number;
    getSelection(focus?: boolean): any;
    getText(index?: number, length?: number): string;
    insertEmbed(index: number, type: string, value: any, source?: string): void;
    insertText(index: number, text: string, source?: string): void;
    insertText(index: number, text: string, formats: any, source?: string): void;
    setContents(delta: any, source?: string): void;
    setSelection(index: number, length?: number, source?: string): void;
    setText(text: string, source?: string): void;
    updateContents(delta: any, source?: string): void;
    format(name: string, value: any, source?: string): void;
    formatLine(index: number, length: number, source?: string): void;
    formatLine(index: number, length: number, formats: any, source?: string): void;
    formatText(index: number, length: number, source?: string): void;
    formatText(index: number, length: number, formats: any, source?: string): void;
    getFormat(index?: number, length?: number): any;
    removeFormat(index: number, length: number, source?: string): void;
    blur(): void;
    focus(): void;
    getBounds(index: number, length?: number): any;
    hasFocus(): boolean;
    update(source?: string): void;
    scrollIntoView(): void;
    on(eventName: string, handler: Function): void;
    once(eventName: string, handler: Function): void;
    off(eventName: string, handler?: Function): void;
    static import(path: string): any;
    static register(path: string, target: any, overwrite?: boolean): void;
    static register(defs: any, overwrite?: boolean): void;
    static find(domNode: Node, bubble?: boolean): any;
  }
}