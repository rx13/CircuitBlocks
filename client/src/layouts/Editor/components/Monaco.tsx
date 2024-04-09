import React, {RefObject} from 'react';
import * as monaco from 'monaco-editor';
import { editor as monacoTypes } from 'monaco-editor';
import { Editor as MonacoEditor } from '@monaco-editor/react';

interface Props {
  code?: string;
  ref?: React.RefObject<typeof monacoTypes>;
  theme?: string;
  editing?: boolean;
  startCode?: string;
  sketch?: string;
}
interface State {
  didCodeChange: boolean;
}
class Monaco extends React.Component<Props, State> {
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;

  constructor(props: Props){
    super(props);
    this.state = {
      didCodeChange: false
    }
    this.didCodeChange = this.didCodeChange.bind(this);
  }

  componentWillUpdate(nextProps: Readonly<Props>, nextState: Readonly<any>, nextContext: any): void {
    if(this.props.startCode != nextProps.startCode){
      this.setCode(nextProps.startCode ? nextProps.startCode : "");
    }
  }

  componentDidMount() {
      window.addEventListener("keydown", this.didCodeChange, false);
  }

  editorDidMount(editor: monacoTypes.IStandaloneCodeEditor/*, monaco: any*/) {
    if(!this.props.editing) return;
    editor.setValue(this.props.startCode ? this.props.startCode : "");
  }

  onMount(editor: monacoTypes.IStandaloneCodeEditor, monaco: any) {
    this.editor = editor;
    this.editorDidMount(editor);
  }

  public getCode(){
    if(this.editor == null) return "";
    return this.editor.getValue();
  }

  public setCode(value: string){
    if(this.editor == null) return "";
    return this.editor.setValue(value);
  }

  public didCodeChange(){
    this.setState({ didCodeChange: this.props.startCode !== this.props.code });
  }

  render() {
    const { theme, editing, code } = this.props;

    const options: monacoTypes.IEditorConstructionOptions = {
      selectOnLineNumbers: true,
      readOnly: !editing,
      fontFamily: 'Source Code Pro',
      fontWeight: '400',
      fontSize: 13,
      minimap: {
        enabled: false
      },
      automaticLayout: true,
      scrollBeyondLastLine: false
    };

    return (
      <MonacoEditor
        language="cpp"
        theme={theme ? theme : 'vs-dark'}
        height="90%"
        value={code}
        options={options}
        onMount={ (editor, _) => { this.editorDidMount(editor); }}
      />
    );
  }
}

export default Monaco;
