import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  InputAdornment,
  Collapse,
  Typography,
  Divider,
  Paper,
  alpha,
  useTheme
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandLess,
  ExpandMore,
  Functions as FunctionsIcon,
  Code as CodeIcon,
  Memory as VariablesIcon
} from '@mui/icons-material';

import * as tconf from './BlocklyToolbox/ToolboxUtils';

import './BlocklyToolbox/toolbox.less';
import { CreateFunctionDialog, ISettingsProps } from './CreateFunction';
import { ToolboxCategorySpecial } from './BlocklyToolbox/Toolbox/Common';

// this is a supertype of pxtc.SymbolInfo (see partitionBlocks)
export interface BlockDefinition {
  name: string;
  xml: string;
  group?: string;
  description?: string;
}

export interface ToolboxProps {
  editorname: string;
  blockly: any;
  categories: ToolboxCategory[];
  // parent: editor.ToolboxEditor;
}

export interface SearchInfo {
  id: string;
  name: string;
  qName?: string;
  block?: string;
  namespace?: string;
  jsdoc?: string;
  field?: [string, string];
  localizedCategory?: string;
  builtinBlock?: boolean;
}

export interface ToolboxState {
  showAdvanced?: boolean;

  selectedItem: number;
  expandedItem?: number;
  height?: number;

  showSearchBox?: boolean;

  hasSearch?: boolean;
  focusSearch?: boolean;
  searchBlocks?: SearchInfo[]; // block ids

  hasError?: boolean;
}

export class Toolbox extends React.Component<ToolboxProps, ToolboxState> {
  private searchboxRef = React.createRef<ToolboxSearch>();
  private selectedItem: CategoryItem | undefined;
  private selectedIndex: number;
  private items: ToolboxCategory[];

  private rootElement: HTMLElement | undefined;

  private categories: ToolboxCategory[];
  private Blockly: any;
  private workspace: any;

  private variablesCat: ToolboxCategory | undefined;
  private functionsCat: ToolboxCategory | undefined;

  private functionsDialog: CreateFunctionDialog | null = null;

  private searchFlyout: any;

  constructor(props: ToolboxProps) {
    super(props);
    this.state = {
      showAdvanced: false,
      selectedItem: -1
    };

    this.setSelection = this.setSelection.bind(this);
    this.advancedClicked = this.advancedClicked.bind(this);
    this.recipesClicked = this.recipesClicked.bind(this);
    this.recoverToolbox = this.recoverToolbox.bind(this);

    this.selectedIndex = -1;
    this.items = [];

    this.Blockly = props.blockly;
    this.workspace = this.Blockly.getMainWorkspace();

    this.categories = [];
    this.loadToolbox(this.props.categories);

    this.Blockly.addChangeListener((e: any) => {
      this.rebuildFunctionsFlyout();
      if (['var_create', 'var_delete', 'var_rename'].indexOf(e.type) != -1) {
        this.rebuildVariablesFlyout();
      } else if (e.type == 'create') {
        if (!this.workspace.toolbox_.flyout_.isVisible()) this.clearSelection();
      }
    });

    // Initialize the functions dialog using a simple approach
    this.initializeFunctionsDialog();

    this.Blockly.Functions.editFunctionExternalHandler = (
      mutation: Element,
      cb: any /* Blockly.Functions.ConfirmEditCallback */
    ) => {
      // Use a global function call approach instead of instance management
      this.showFunctionDialog(mutation, cb);
    };
  }

  private initializeFunctionsDialog() {
    // We'll create the dialog on-demand instead of pre-creating it
    // This avoids the complex reference management issues
  }

  private showFunctionDialog(mutation: Element, cb: any) {
    // Create dialog element on each call - this is simpler and more reliable
    const dialogContainer = document.createElement('div');
    document.body.appendChild(dialogContainer);

    const root = createRoot(dialogContainer);
    
    const handleDialogClose = () => {
      this.rebuildFunctionsFlyout();
      // Clean up the dialog after use
      setTimeout(() => {
        root.unmount();
        if (dialogContainer.parentNode) {
          dialogContainer.parentNode.removeChild(dialogContainer);
        }
      }, 100);
    };
    
    root.render(
      React.createElement(CreateFunctionDialog, {
        visible: true,
        blockly: this.Blockly,
        initialMutation: mutation,
        functionCallback: cb,
        mainWorkspace: this.workspace,
        functionCreateCallback: handleDialogClose,
        onClose: handleDialogClose
      })
    );
  }

  public loadToolbox(categories: ToolboxCategory[]) {
    this.categories = categories;
    this.categories.forEach((cat) => this.buildCategoryFlyout(cat, this));
  }

  public rebuildVariablesFlyout() {
    if (!this.variablesCat) return;

    this.variablesCat.flyout = this.buildFlyout(this.variablesCat, this, undefined, true);
  }

  rebuildFunctionsFlyout() {
    if (!this.functionsCat) return;

    this.functionsCat.flyout = this.buildFlyout(this.functionsCat, this, undefined, true);
  }

  buildCategoryFlyout(category: ToolboxCategory, toolbox: Toolbox, parent?: ToolboxCategory) {
    if (category.special == ToolboxCategorySpecial.VARIABLES) {
      this.variablesCat = category;
    } else if (category.special == ToolboxCategorySpecial.FUNCTIONS) {
      this.functionsCat = category;
    }

    category.flyout = toolbox.buildFlyout(category, toolbox, parent);
    category.subcategories.forEach((cat) => toolbox.buildCategoryFlyout(cat, toolbox, category));
  }

  constructLabel(text: string) {
    return this.createFlyoutGroupLabel(text);
  }

  createFlyoutGroupLabel(
    name: string,
    icon?: string,
    labelLineWidth?: string,
    helpCallback?: string
  ) {
    const groupLabel = this.createFlyoutLabel(name, undefined, icon);
    groupLabel.setAttribute('web-class', 'blocklyFlyoutGroup');
    groupLabel.setAttribute('web-line', '1.5');
    if (labelLineWidth) groupLabel.setAttribute('web-line-width', labelLineWidth);
    if (helpCallback) {
      groupLabel.setAttribute('web-help-button', 'true');
      groupLabel.setAttribute('callbackkey', helpCallback);
    }
    return groupLabel;
  }

  async createFlyoutHeadingLabel(name: string, color: string, icon?: string, iconClass?: string) {
    const colorValue = await tconf.convertColor(color);
    const headingLabel = this.createFlyoutLabel(name, colorValue, icon, iconClass);
    headingLabel.setAttribute('web-class', 'blocklyFlyoutHeading');
    return headingLabel;
  }

  async showFlyoutHeadingLabel(name: string, icon: string, color: string) {
    const categoryName = name;
    const iconClass = `blocklyTreeIcon${icon ? name.toLowerCase() : 'Default'}`.replace(/\s/g, '');
    const headingLabel = await this.createFlyoutHeadingLabel(categoryName, color, icon, iconClass);
    return headingLabel;
  }

  createFlyoutLabel(name: string, color?: string, icon?: string, iconClass?: string): HTMLElement {
    // Add the Heading label
    const headingLabel = document.createElement('label') as HTMLElement;
    headingLabel.setAttribute('text', name);
    if (color) {
      headingLabel.setAttribute('web-icon-color', tconf.convertColor(color));
    }
    if (icon) {
      if (icon.length === 1) {
        headingLabel.setAttribute('web-icon', icon);
        if (iconClass) headingLabel.setAttribute('web-icon-class', iconClass);
      } else {
        headingLabel.setAttribute('web-icon-class', `blocklyFlyoutIcon${name}`);
      }
    }
    return headingLabel;
  }

  search(term: string) {
    const { workspace } = this;
    const flyout: any = this.searchFlyout
      ? this.searchFlyout
      : this.Blockly.Functions.createFlyout(workspace, workspace.toolbox_.flyout_.svgGroup_);
    this.searchFlyout = flyout;

    this.clear();

    if (term == '') {
      flyout.setVisible(false);
      return;
    }

    const blocks: any[] = [];

    const { Blockly } = this;

    function searchCategories(cat: ToolboxCategory) {
      if (!cat.blocks) return;

      cat.blocks.forEach((block: any) => {
        if (block.name.replace(/_/g, ' ').toLowerCase().includes(term.toLowerCase())) {
          blocks.push(Blockly.Xml.textToDom(block.xml));
        }
      });

      cat.subcategories.forEach(searchCategories);
    }

    this.categories.forEach(searchCategories);

    if (blocks.length == 0) {
      blocks.push(this.constructLabel('No results'));
    }

    flyout.show(blocks);
    flyout.setVisible(true);
    this.workspace.toolbox_.flyout_ = flyout;
  }

  buildFlyout(
    category: ToolboxCategory,
    toolbox: Toolbox,
    parent?: ToolboxCategory,
    visible?: boolean
  ) {
    const { workspace } = toolbox;
    const flyout: any = category.flyout
      ? category.flyout
      : toolbox.Blockly.Functions.createFlyout(workspace, workspace.toolbox_.flyout_.svgGroup_);
    const wasVisible = flyout.isVisible();
    flyout.setVisible(false);

    if (!category.blocks) return flyout;

    const blocks: any[] = [];

    const color: string = category.color == 'more' && parent ? parent.color : category.color;

    blocks.push(toolbox.showFlyoutHeadingLabel(category.name, category.icon, color));

    if (category.special == ToolboxCategorySpecial.VARIABLES) {
      toolbox.Blockly.Variables.flyoutCategory(toolbox.workspace).forEach((item: any) =>
        blocks.push(item)
      );
    } else if (category.special == ToolboxCategorySpecial.FUNCTIONS) {
      toolbox.Blockly.Functions.flyoutCategory(toolbox.workspace).forEach((item: any) =>
        blocks.push(item)
      );
    } else {
      let currentLabel = '';
      category.blocks.forEach((block) => {
        const label = block.group;
        if (label && label != currentLabel) {
          currentLabel = label;
          blocks.push(toolbox.constructLabel(label));
        }

        blocks.push(toolbox.Blockly.Xml.textToDom(block.xml));
      });
    }

    flyout.show(blocks);
    flyout.setVisible(!!visible && wasVisible);

    return flyout;
  }

  reflowLayout(cat: ToolboxCategory) {
    if (cat.flyout) cat.flyout.reflow();
    cat.subcategories.forEach((c) => this.reflowLayout(c));
  }

  setSelectedItem(item: CategoryItem) {
    this.selectedItem = item;
  }

  setPreviousItem() {
    if (this.selectedIndex > 0) {
      const newIndex = --this.selectedIndex;
      // Check if the previous item has a subcategory
      const previousItem = this.items[newIndex];
      this.setSelection(previousItem, newIndex);
    } else if (this.state.showSearchBox) {
      // Focus the search box if it exists
      const searchBox = this.searchboxRef.current;
      if (searchBox) searchBox.focus();
    }
  }

  setNextItem() {
    if (this.items.length - 1 > this.selectedIndex) {
      const newIndex = ++this.selectedIndex;
      this.setSelection(this.items[newIndex], newIndex);
    }
  }

  setSearch() {
    // Focus the search box if it exists
    const searchBox = this.searchboxRef.current;
    if (searchBox) searchBox.focus();
  }

  clear() {
    this.closeFlyout();
    this.clearSelection();
    this.selectedIndex = 0;
    this.selectedTreeRow = undefined;
  }

  clearSelection() {
    this.setState({ selectedItem: -1, expandedItem: undefined, focusSearch: false });
  }

  clearSearch() {
    this.setState({ hasSearch: false, searchBlocks: undefined, focusSearch: false });
  }

  setSelection(category: ToolboxCategory, index: number) {
    if (this.state.selectedItem == index) {
      this.clearSelection();
      this.closeFlyout();
    } else {
      /* if (customClick) {
                handled = customClick(parent);
                if (handled) return;
            } */

      // TODO: custom click. ako je handlan, niš dalje

      this.setState({ selectedItem: index, expandedItem: index, focusSearch: false });

      this.selectedIndex = index;
      this.selectedTreeRow = category;
      if (category.advanced && !this.state.showAdvanced) this.showAdvanced();

      if (true /*! customClick */) {
        // Show flyout
        this.showFlyout(category);
      }
    }
  }

  selectFirstItem() {
    if (this.items[0]) {
      this.setSelection(this.items[0], 0);
    }
  }

  moveFocusToFlyout() {
    /* const { parent } = this.props;
        parent.moveFocusToFlyout(); */
  }

  componentDidUpdate(prevProps: ToolboxProps, prevState: ToolboxState) {
    if (
      prevState.showAdvanced != this.state.showAdvanced ||
      this.state.expandedItem != prevState.expandedItem
    ) {
      // this.props.parent.resize();
    }
    if (this.state.hasSearch && this.state.searchBlocks != prevState.searchBlocks) {
      // Referesh search items
      this.refreshSearchItem();
    } else if (prevState.hasSearch && !this.state.hasSearch && this.state.selectedItem == 0) {
      // No more search
      this.closeFlyout();
    }

    this.categories.forEach((cat) => this.reflowLayout(cat));
  }

  componentDidCatch(error: any, info: any) {
    // Log what happened
    const { editorname } = this.props;

    // Update error state
    this.setState({ hasError: true });
  }

  recoverToolbox() {
    // Recover from above error state
    this.setState({ hasError: false });
  }

  advancedClicked() {
    const { editorname } = this.props;
    this.showAdvanced();
  }

  recipesClicked() {
    const { editorname } = this.props;
    // this.props.parent.parent.showRecipesDialog();
  }

  showAdvanced() {
    // const { parent } = this.props;
    if (
      this.selectedItem &&
      this.selectedItem.props.treeRow &&
      this.selectedItem.props.treeRow.advanced
    ) {
      this.clear();
      this.closeFlyout();
    }
    this.setState({ showAdvanced: !this.state.showAdvanced });
  }

  /*    getSearchBlocks(): BlockDefinition[] {
        const { parent } = this.props;
        const { searchBlocks } = this.state;
        return searchBlocks.map(searchResult => {
            return {
                name: searchResult.qName,
                attributes: {
                    blockId: searchResult.id
                },
                builtinBlock: searchResult.builtinBlock,
                builtinField: searchResult.field
            }
        });
    } */

  refreshSelection() {
    // const { parent } = this.props;
    if (!this.state.selectedItem || !this.selectedTreeRow) return;
    if (false /* this.selectedTreeRow.customClick */) {
      // this.selectedTreeRow.customClick(parent);
    } else {
      this.showFlyout(this.selectedTreeRow);
    }
  }

  refreshSearchItem() {
    /* const searchTreeRow = ToolboxSearch.getSearchTreeRow();
        this.showFlyout(searchTreeRow); */
  }

  private selectedTreeRow: ToolboxCategory | undefined;
  private showFlyout(treeRow: ToolboxCategory) {
    this.closeFlyout();

    this.workspace.toolbox_.flyout_ = treeRow.flyout;
    this.workspace.toolbox_.flyout_.setVisible(true);
    this.workspace.toolbox_.flyout_.scrollToStart();
    this.workspace.toolbox_.flyout_.position();
  }

  closeFlyout() {
    this.workspace.toolbox_.flyout_.setVisible(false);
  }

  handleRootElementRef = (c: HTMLDivElement) => {
    this.rootElement = c;
  };

  render() {
    const { editorname } = this.props;
    const { showAdvanced, selectedItem, expandedItem, hasError } = this.state;
    const visible = true;
    const hasSearch = true;
    const loading = false;
    
    if (!visible) return <Box sx={{ display: 'none' }} />;

    if (loading || hasError) {
      return (
        <Paper 
          elevation={2}
          sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: 2 
          }}
        >
          {loading && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Loading toolbox...
              </Typography>
            </Box>
          )}
          {hasError && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="error">
                Toolbox crashed. Please refresh the page.
              </Typography>
            </Box>
          )}
        </Paper>
      );
    }

    const hasAdvanced = false;
    const normalCategories: ToolboxCategory[] = this.categories;
    const advancedCategories: ToolboxCategory[] = [];

    let index = 0;
    
    return (
      <Paper
        ref={this.handleRootElementRef}
        elevation={2}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0,
          backgroundColor: 'background.paper',
        }}
        id={`${editorname}EditorToolbox`}
        className="pxtToolbox"
      >
        <ToolboxStyle categories={normalCategories} />
        
        <ToolboxSearch ref={this.searchboxRef} toolbox={this} editorname={editorname} />
        
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: 8,
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'action.disabled',
              borderRadius: 4,
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            },
          }}
          className="blocklyTreeRoot"
        >
          <List
            component="nav"
            role="tree"
            dense
            sx={{ 
              py: 0,
              '& .MuiListItem-root': {
                py: 0,
              },
            }}
          >
            {normalCategories.map((treeRow) => {
              const i = index++;
              return (
                <CategoryItem
                  toolbox={this}
                  key={'catitem_' + i}
                  index={i}
                  treeRow={treeRow}
                  onCategoryClick={this.setSelection}
                >
                  {treeRow.subcategories.map((subTreeRow) => {
                    const j = index++;
                    return (
                      <CategoryItem
                        key={'catitem_' + j}
                        index={j}
                        toolbox={this}
                        treeRow={subTreeRow}
                        parentTreeRow={treeRow}
                        onCategoryClick={this.setSelection}
                      />
                    );
                  })}
                </CategoryItem>
              );
            })}
            
            {hasAdvanced && <Divider key="advancedseparator" sx={{ my: 1 }} />}
            
            {hasAdvanced && (
              <CategoryItem
                index={-1}
                toolbox={this}
                treeRow={{
                  subcategories: [],
                  name: tconf.advancedTitle(),
                  color: tconf.getNamespaceColor('advanced'),
                  icon: tconf.getNamespaceIcon(
                    showAdvanced ? 'advancedexpanded' : 'advancedcollapsed'
                  )
                }}
                onCategoryClick={this.advancedClicked}
              />
            )}
            
            {showAdvanced &&
              advancedCategories.map((treeRow) => (
                <CategoryItem
                  toolbox={this}
                  key={`advanced_${index++}`}
                  index={index - 1}
                  treeRow={treeRow}
                  onCategoryClick={this.setSelection}
                >
                  {treeRow.subcategories?.map((subTreeRow) => (
                    <CategoryItem
                      toolbox={this}
                      key={`advanced_sub_${index++}`}
                      index={index - 1}
                      treeRow={subTreeRow}
                      onCategoryClick={this.setSelection}
                    />
                  ))}
                </CategoryItem>
              ))}
          </List>
        </Box>
      </Paper>
    );
  }
}

export interface CategoryItemProps extends TreeRowProps {
  toolbox: Toolbox;
  onCategoryClick?: (treeRow: ToolboxCategory, index: number) => void;
  index: number;
  children?: React.ReactNode;
}

export interface CategoryItemState {
  selected?: boolean;
}

export class CategoryItem extends React.Component<CategoryItemProps, CategoryItemState> {
  private treeRowElement: TreeRow | undefined;

  constructor(props: CategoryItemProps) {
    super(props);

    this.state = {
      selected: props.selected
    };

    this.handleClick = this.handleClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  getTreeRow() {
    return this.treeRowElement;
  }

  componentWillReceiveProps(nextProps: CategoryItemProps) {
    const newState: CategoryItemState = {};
    if (nextProps.selected != undefined) {
      newState.selected = nextProps.selected;
    }
    if (Object.keys(newState).length > 0) this.setState(newState);
  }

  componentDidUpdate(prevProps: CategoryItemProps, prevState: CategoryItemState) {
    const { toolbox } = this.props;
    if (this.state.selected) {
      this.props.toolbox.setSelectedItem(this);
      if (!toolbox.state.focusSearch) this.focusElement();
    }
  }

  focusElement() {
    this.treeRowElement && this.treeRowElement.focus();
  }

  handleClick(e: React.MouseEvent<any>) {
    const { treeRow, onCategoryClick, index } = this.props;
    if (onCategoryClick) onCategoryClick(treeRow, index);

    e.preventDefault();
    e.stopPropagation();
  }

  TAB_KEY = 9;
  ESC_KEY = 27;
  ENTER_KEY = 13;
  SPACE_KEY = 32;

  keyCodeFromEvent(e: any) {
    return typeof e.which === 'number' ? e.which : e.keyCode;
  }

  handleKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    const { toolbox } = this.props;
    const isRtl = false;

    const charCode = this.keyCodeFromEvent(e);
    if (charCode == 40) {
      //  DOWN
      this.nextItem();
    } else if (charCode == 38) {
      // UP
      this.previousItem();
    } else if ((charCode == 39 && !isRtl) || (charCode == 37 && isRtl)) {
      // (LEFT & LTR) || (RIGHT & RTL)
      // Focus inside flyout
      toolbox.moveFocusToFlyout();
    } else if (charCode == 27) {
      // ESCAPE
      // Close the flyout
      toolbox.closeFlyout();
    } else if (charCode == this.ENTER_KEY || charCode == this.SPACE_KEY) {
      // sui.fireClickOnEnter.call(this, e);
    } else if (
      charCode == this.TAB_KEY ||
      charCode == 37 /* Left arrow key */ ||
      charCode == 39 /* Left arrow key */ ||
      charCode == 17 /* Ctrl Key */ ||
      charCode == 16 /* Shift Key */ ||
      charCode == 91 /* Cmd Key */
    ) {
      // Escape tab and shift key
    } else {
      toolbox.setSearch();
    }
  }

  previousItem() {
    const { toolbox } = this.props;

    toolbox.setPreviousItem();
  }

  nextItem() {
    const { toolbox } = this.props;

    toolbox.setNextItem();
  }

  handleTreeRowRef = (c: TreeRow) => {
    this.treeRowElement = c;
  };

  render() {
    const selectedIndex: number = this.props.toolbox.state.selectedItem;

    const selected: boolean = selectedIndex == this.props.index;
    const childSelected: boolean =
      selectedIndex > this.props.index &&
      selectedIndex <= this.props.index + this.props.treeRow.subcategories.length;

    return (
      <TreeItem>
        <TreeRow
          ref={this.handleTreeRowRef}
          isRtl={false}
          {...this.props}
          selected={selected}
          onClick={this.handleClick}
          onKeyDown={this.handleKeyDown}
          index={this.props.index}
        />
        <TreeGroup visible={selected || childSelected}>{this.props.children}</TreeGroup>
      </TreeItem>
    );
  }
}

export interface ToolboxCategory {
  name: string;
  color: string;
  icon: string;

  blocks?: BlockDefinition[];
  subcategories: ToolboxCategory[];

  customClick?: () => boolean;
  advanced?: boolean;

  flyout?: any;
  special?: ToolboxCategorySpecial;
}

export interface TreeRowProps {
  treeRow: ToolboxCategory;
  parentTreeRow?: ToolboxCategory;
  onClick?: (e: React.MouseEvent<any>) => void;
  onKeyDown?: (e: React.KeyboardEvent<any>) => void;
  selected?: boolean;
  isRtl?: boolean;
  index: number;
}

// Modern TreeRow component using MUI components
export const ModernTreeRow: React.FC<TreeRowProps> = ({ 
  treeRow, 
  parentTreeRow, 
  selected, 
  onClick, 
  onKeyDown, 
  index 
}) => {
  const theme = useTheme();
  
  const isValidColor = (color: any): boolean => {
    if (!color || color === '0' || color === 0 || typeof color === 'number') {
      return false;
    }
    if (typeof color !== 'string') {
      return false;
    }
    // Additional validation: check if it's a valid CSS color
    const s = new Option().style;
    s.color = color;
    return s.color !== '';
  };

  const getMetaColor = () => {
    const color = treeRow.color === 'more' && parentTreeRow 
      ? parentTreeRow.color 
      : treeRow.color;
    
    // Get the converted color and ensure it's valid
    let convertedColor = tconf.convertColor(color || 'black') || tconf.getNamespaceColor('default');
    
    // Validate the color format - if it's not a valid CSS color, use a fallback
    if (!isValidColor(convertedColor)) {
      convertedColor = theme.palette.primary.main; // Use theme primary color as fallback
    }
    
    return convertedColor;
  };

  const metaColor = getMetaColor();
  const { name } = treeRow;

  // Get appropriate icon based to category
  const getIcon = () => {
    switch (name.toLowerCase()) {
      case 'functions':
        return <FunctionsIcon sx={{ fontSize: '1.2rem' }} />;
      case 'variables':
        return <VariablesIcon sx={{ fontSize: '1.2rem' }} />;
      default:
        // Use material icon from ToolboxUtils
        const materialIcon = tconf.getNamespaceIcon(name) || tconf.getNamespaceIcon('default');
        if (materialIcon) {
          return (
            <Box
              component="span"
              className="material-icons"
              sx={{
                fontSize: '1.2rem',
                fontFamily: 'Material Icons, MaterialIcons, sans-serif !important',
                display: 'inline-block'
              }}
            >
              {materialIcon}
            </Box>
          );
        }
        return <CodeIcon sx={{ fontSize: '1.2rem' }} />;
    }
  };

  return (
    <ListItem disablePadding>
      <ListItemButton
        selected={selected}
        onClick={onClick}
        onKeyDown={onKeyDown}
        sx={{
          borderLeft: `4px solid ${metaColor}`,
          minHeight: 44,
          '&.Mui-selected': {
            backgroundColor: alpha(metaColor, 0.12),
            borderLeft: `4px solid ${metaColor}`,
            '&:hover': {
              backgroundColor: alpha(metaColor, 0.2),
            },
          },
          '&:hover': {
            backgroundColor: alpha(metaColor, 0.08),
          },
          transition: theme.transitions.create(['background-color', 'border-color'], {
            duration: theme.transitions.duration.short,
          }),
        }}
      >
        <ListItemIcon sx={{ minWidth: 36, color: selected ? metaColor : 'inherit' }}>
          {getIcon()}
        </ListItemIcon>
        <ListItemText
          primary={name}
          primaryTypographyProps={{
            variant: 'body2',
            fontWeight: selected ? 600 : 400,
            color: selected ? metaColor : 'text.primary',
            sx: {
              transition: theme.transitions.create(['color', 'font-weight'], {
                duration: theme.transitions.duration.short,
              }),
            },
          }}
        />
      </ListItemButton>
    </ListItem>
  );
};

export class TreeRow extends React.Component<TreeRowProps, {}> {
  private treeRow: HTMLElement | undefined;

  constructor(props: TreeRowProps) {
    super(props);
    this.state = {};

    this.onmouseenter = this.onmouseenter.bind(this);
    this.onmouseleave = this.onmouseleave.bind(this);
  }

  focus() {
    if (this.treeRow) this.treeRow.focus();
  }

  getProperties() {
    const { treeRow } = this.props;
    return treeRow;
  }

  onmouseenter() {
    const appTheme = 'default'; // pxt.appTarget.appTheme;
    const metaColor = this.getMetaColor();
    const invertedMultipler = /* appTheme.blocklyOptions
            && appTheme.blocklyOptions.toolboxOptions
            && appTheme.blocklyOptions.toolboxOptions.invertedMultiplier || */ 0.3;

    // if (appTheme.invertedToolbox) {
    if (false) {
      // this.treeRow.style.backgroundColor = "#333"; /*pxt.toolbox.fadeColor(metaColor || '#ddd', invertedMultipler, false);*/
    }
  }

  onmouseleave() {
    const appTheme = 'default'; // pxt.appTarget.appTheme;
    const metaColor = this.getMetaColor();
    // if (appTheme.invertedToolbox) {
    if (false) {
      // this.treeRow.style.backgroundColor = (metaColor || '#ddd');
    }
  }

  getMetaColor() {
    const color =
      this.props.treeRow.color == 'more' && this.props.parentTreeRow
        ? this.props.parentTreeRow.color
        : this.props.treeRow.color;
    return tconf.convertColor(color || 'black') || tconf.getNamespaceColor('default');
  }

  handleTreeRowRef = (c: HTMLDivElement) => {
    this.treeRow = c;
  };

  render() {
    // Use the modern component for better UX
    return <ModernTreeRow {...this.props} />;
  }
}

export class TreeSeparator extends React.Component<{}, {}> {
  render() {
    return (
      <TreeItem>
        <div className="blocklyTreeSeparator">
          <span style={{ display: 'inline-block' }} role="presentation" />
        </div>
      </TreeItem>
    );
  }
}

export interface TreeItemProps {
  selected?: boolean;
  children?: any;
}

export class TreeItem extends React.Component<TreeItemProps, {}> {
  render() {
    const { selected } = this.props;
    return (
      <div role="treeitem" aria-selected={selected}>
        {this.props.children}
      </div>
    );
  }
}

export interface TreeGroupProps {
  visible?: boolean;
  children?: any;
}

export class TreeGroup extends React.Component<TreeGroupProps, {}> {
  render() {
    const { visible } = this.props;

    return (
      <div
        role="group"
        style={{ backgroundPosition: '0px 0px', display: visible ? 'block' : 'none' }}
      >
        {this.props.children}
      </div>
    );
  }
}

export interface ToolboxSearchProps {
  // parent: editor.ToolboxEditor;
  editorname: string;
  toolbox: Toolbox;
}

export interface ToolboxSearchState {
  searchAccessibilityLabel?: string;
}

export class ToolboxSearch extends React.Component<ToolboxSearchProps, ToolboxSearchState> {
  private searchInputRef = React.createRef<HTMLInputElement>();

  constructor(props: ToolboxSearchProps) {
    super(props);
    this.state = {};

    this.searchImmediate = this.searchImmediate.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  private search = () => setTimeout(() => this.searchImmediate(), 300);

  handleChange() {
    this.search();
  }

  handleKeyDown(e: React.KeyboardEvent<any>) {
    const { toolbox } = this.props;
    const charCode = typeof e.which === 'number' ? e.which : e.keyCode;
    if (charCode === 40 /* Down Key */) {
      // Select first item in the toolbox
      toolbox.selectFirstItem();
    }
  }

  focus() {
    this.searchInputRef.current?.focus();
  }

  searchImmediate() {
    const { /* parent, */ toolbox, editorname } = this.props;
    const searchTerm = this.searchInputRef.current?.value || '';

    const searchAccessibilityLabel = '';
    const hasSearch = false;

    toolbox.search(searchTerm);

    // Execute search
    /* parent.searchAsync(searchTerm)
            .done((blocks) => {
                if (blocks.length == 0) {
                    searchAccessibilityLabel = lf("No search results...");
                } else {
                    searchAccessibilityLabel = lf("{0} result matching '{1}'", blocks.length, searchTerm.toLowerCase());
                }
                hasSearch = searchTerm != '';

                const newState: ToolboxState = {};
                newState.hasSearch = hasSearch;
                newState.searchBlocks = blocks;
                newState.focusSearch = true;
                if (hasSearch) newState.selectedItem = 'search';
                toolbox.setState(newState);

                this.setState({ searchAccessibilityLabel: searchAccessibilityLabel });
            }); */
  }

  render() {
    const { searchAccessibilityLabel } = this.state;
    return (
      <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <TextField
          inputRef={this.searchInputRef}
          size="small"
          fullWidth
          placeholder="Search blocks..."
          onFocus={this.searchImmediate}
          onKeyDown={this.handleKeyDown}
          onChange={this.handleChange}
          aria-label="Search blocks"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: '1.2rem', color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: 'background.paper',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
              '&.Mui-focused': {
                backgroundColor: 'background.paper',
              },
            },
          }}
        />
        {searchAccessibilityLabel && (
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              left: -10000,
              width: 1,
              height: 1,
              overflow: 'hidden',
            }}
            aria-live="polite"
          >
            {searchAccessibilityLabel}
          </Typography>
        )}
      </Box>
    );
  }
}

export class ToolboxTrashIcon extends React.Component<{}, {}> {
  render() {
    return (
      <div id="blocklyTrashIcon" style={{ opacity: 0, display: 'none' }}>
        <i className="trash icon" aria-hidden="true" />
      </div>
    );
  }
}

interface ToolboxStyleProps {
  categories: ToolboxCategory[];
}

export class ToolboxStyle extends React.Component<ToolboxStyleProps, {}> {
  addCategoryStyle(category: ToolboxCategory, parent?: ToolboxCategory) {
    const color: string = category.color == 'more' && parent ? parent.color : category.color;

    this.style += `span.docs.inlineblock.cat_${this.index} {
                    background-color: ${color};
                    border-color: ${tconf.fadeColor(color, 0.1, false)};
                }\n`;

    this.index++;

    category.subcategories.forEach((subcat) => this.addCategoryStyle(subcat, category));
  }

  private index = 0;
  private style = '';

  render() {
    const { categories } = this.props;

    const styles = '';

    this.index = 0;
    this.style = '';

    categories.forEach((category) => this.addCategoryStyle(category));

    return <style>{this.style}</style>;
  }
}

export default Toolbox;
