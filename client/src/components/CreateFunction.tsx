import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  ButtonGroup,
  Typography,
  Box,
  IconButton,
  Divider,
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  TextFields as TextIcon,
  Functions as NumberIcon,
  ToggleOn as BooleanIcon
} from '@mui/icons-material';
import { defaultIconForArgType } from './BlocklyToolbox/ToolboxUtils';

export interface ISettingsProps {
  visible?: boolean;
  functionCreateCallback?: () => void;
  blockly: any;
  initialMutation?: Element | null;
  functionCallback?: any;
  mainWorkspace?: any;
  onClose?: () => void;
}

interface FunctionEditorTypeInfo {
  typeName: string;
  label: string;
  icon: React.ReactElement;
  defaultName?: string;
}

export interface CreateFunctionDialogState {
  visible: boolean;
  functionEditorWorkspace?: any;
  functionCallback?: any;
  initialMutation?: Element | null;
  functionBeingEdited?: any;
  mainWorkspace?: any;
  isLoading: boolean;
  error?: string;
}

export class CreateFunctionDialog extends React.Component<
  ISettingsProps,
  CreateFunctionDialogState
> {
  static cachedFunctionTypes: FunctionEditorTypeInfo[] | null = null;
  private Blockly: any;
  private workspaceDiv: HTMLDivElement | null = null;

  constructor(props: ISettingsProps) {
    super(props);
    this.state = {
      visible: props.visible || false,
      functionEditorWorkspace: null,
      functionCallback: props.functionCallback || null,
      initialMutation: props.initialMutation || null,
      functionBeingEdited: null,
      mainWorkspace: props.mainWorkspace || null,
      isLoading: false,
      error: undefined
    };

    this.Blockly = props.blockly;
  }

  componentDidMount() {
    if (this.state.visible && this.state.initialMutation) {
      this.setupWorkspace();
    }
  }

  componentDidUpdate(prevProps: Readonly<ISettingsProps>) {
    // Handle prop changes for new dialog instances
    if (this.props.visible && !prevProps.visible) {
      this.setState({
        visible: true,
        initialMutation: this.props.initialMutation,
        functionCallback: this.props.functionCallback,
        mainWorkspace: this.props.mainWorkspace,
        isLoading: false,
        error: undefined
      }, () => {
        if (this.props.initialMutation) {
          this.setupWorkspace();
        }
      });
    }
  }

  private setupWorkspace = async () => {
    this.setState({ isLoading: true, error: undefined });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100)); // Allow DOM to render
      
      const workspaceDiv = document.getElementById('functionEditorWorkspace');
      if (!workspaceDiv) {
        throw new Error('Workspace div not found');
      }

      // Clear any existing workspace
      if (this.state.functionEditorWorkspace) {
        this.state.functionEditorWorkspace.dispose();
      }

      // Create the function editor workspace
      const functionEditorWorkspace = this.Blockly.inject(workspaceDiv, {
        trashcan: false,
        scrollbars: true,
        zoom: { controls: true, wheel: false }
      });

      functionEditorWorkspace.showContextMenu_ = () => {}; // Disable context menu
      functionEditorWorkspace.clear();

      // Create function declaration block
      const functionBeingEdited = functionEditorWorkspace.newBlock('function_declaration');
      if (this.state.initialMutation) {
        functionBeingEdited.domToMutation(this.state.initialMutation);
      }
      
      functionBeingEdited.initSvg();
      functionBeingEdited.render(false);
      functionEditorWorkspace.centerOnBlock(functionBeingEdited.id);

      // Add change listener
      functionEditorWorkspace.addChangeListener(() => {
        if (functionBeingEdited) {
          functionBeingEdited.updateFunctionSignature();
        }
      });

      this.setState({
        functionEditorWorkspace,
        functionBeingEdited,
        isLoading: false
      });

      // Resize workspace
      this.Blockly.svgResize(functionEditorWorkspace);
    } catch (error) {
      console.error('Error setting up function editor workspace:', error);
      this.setState({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to setup workspace' 
      });
    }
  };

  private handleClose = () => {
    this.cleanup();
    this.setState({ visible: false });
    this.props.onClose?.();
  };

  private handleCancel = () => {
    this.cleanup();
    this.handleClose();
  };

  private handleConfirm = () => {
    const { functionBeingEdited, mainWorkspace, functionCallback } = this.state;
    
    if (!functionBeingEdited || !mainWorkspace || !functionCallback) {
      this.setState({ error: 'Missing required data for function creation' });
      return;
    }

    try {
      this.Blockly.hideChaff();
      const mutation = functionBeingEdited.mutationToDom();
      
      if (this.Blockly.Functions.validateFunctionExternal(mutation, mainWorkspace)) {
        functionCallback(mutation);
        this.props.functionCreateCallback?.();
        this.handleClose();
      } else {
        this.setState({ error: 'Invalid function configuration' });
      }
    } catch (error) {
      console.error('Error confirming function:', error);
      this.setState({ error: 'Failed to create function' });
    }
  };

  private cleanup = () => {
    const { functionEditorWorkspace, mainWorkspace } = this.state;
    
    if (functionEditorWorkspace) {
      functionEditorWorkspace.clear();
      functionEditorWorkspace.dispose();
    }
    
    if (mainWorkspace) {
      mainWorkspace.refreshToolboxSelection?.();
    }
    
    this.setState({
      functionEditorWorkspace: null,
      functionBeingEdited: null,
      isLoading: false,
      error: undefined
    });
  };

  private addArgument = (typeName: string) => {
    const { functionBeingEdited } = this.state;
    if (!functionBeingEdited) return;

    try {
      switch (typeName) {
        case 'boolean':
          functionBeingEdited.addBooleanExternal();
          break;
        case 'string':
          functionBeingEdited.addStringExternal();
          break;
        case 'number':
          functionBeingEdited.addNumberExternal();
          break;
        default:
          functionBeingEdited.addCustomExternal(typeName);
          break;
      }
    } catch (error) {
      console.error('Error adding argument:', error);
      this.setState({ error: 'Failed to add parameter' });
    }
  };

  private getArgumentTypes(): FunctionEditorTypeInfo[] {
    if (!CreateFunctionDialog.cachedFunctionTypes) {
      CreateFunctionDialog.cachedFunctionTypes = [
        {
          label: 'Text',
          typeName: 'string',
          icon: <TextIcon />
        },
        {
          label: 'Boolean',
          typeName: 'boolean',
          icon: <BooleanIcon />
        },
        {
          label: 'Number',
          typeName: 'number',
          icon: <NumberIcon />
        }
      ];
    }
    return CreateFunctionDialog.cachedFunctionTypes;
  }

  componentWillUnmount() {
    this.cleanup();
  }

  // Backward compatibility method for the old API
  show(
    initialMutation: Element,
    cb: any,
    mainWorkspace: any
  ) {
    this.setState({
      visible: true,
      initialMutation,
      functionCallback: cb,
      mainWorkspace,
      isLoading: false,
      error: undefined
    }, () => {
      this.setupWorkspace();
    });
  }

  // Backward compatibility method
  hide() {
    this.handleClose();
  }

  render() {
    const { visible, isLoading, error } = this.state;
    const types = this.getArgumentTypes();

    return (
      <Dialog 
        open={visible} 
        onClose={this.handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: '500px',
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1
        }}>
          <Typography variant="h6" component="h2">
            Create Custom Function
          </Typography>
          <IconButton
            aria-label="close"
            onClick={this.handleClose}
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ pt: 2, pb: 2 }}>
          {error && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            </Box>
          )}

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              Add Parameters
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }} color="text.secondary">
              Click on a parameter type to add it to your function:
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {types.map((type) => (
                <Chip
                  key={type.typeName}
                  label={type.label}
                  icon={type.icon}
                  onClick={() => this.addArgument(type.typeName)}
                  variant="outlined"
                  clickable
                  disabled={isLoading}
                  sx={{
                    '&:hover': {
                      bgcolor: 'primary.light',
                      color: 'white'
                    }
                  }}
                />
              ))}
            </Box>
          </Box>

          <Box 
            sx={{ 
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              minHeight: '300px',
              position: 'relative',
              bgcolor: 'grey.50'
            }}
          >
            {isLoading && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(255, 255, 255, 0.8)',
                  zIndex: 1
                }}
              >
                <Typography>Loading workspace...</Typography>
              </Box>
            )}
            <div 
              id="functionEditorWorkspace" 
              style={{ 
                width: '100%', 
                height: '300px',
                opacity: isLoading ? 0.5 : 1
              }} 
            />
          </Box>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={this.handleCancel}
            variant="outlined"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={this.handleConfirm}
            variant="contained"
            disabled={isLoading || !this.state.functionBeingEdited}
            startIcon={<AddIcon />}
          >
            Create Function
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
}
