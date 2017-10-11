import React from 'react';
import PropTypes from 'prop-types';
import createStore from './createStore';
import TableRow from './TableRow';
import ExpandedRowHeigh from './ExpandedRowHeigh';
import ExpandedRowVisible from './ExpandedRowVisible';

export default class ExpandableTable extends React.Component {
  static propTypes = {
    expandIconAsCell: PropTypes.bool,
    expandedRowKeys: PropTypes.array,
    expandedRowClassName: PropTypes.func,
    defaultExpandAllRows: PropTypes.bool,
    defaultExpandedRowKeys: PropTypes.array,
    expandIconColumnIndex: PropTypes.number,
    childrenColumnName: PropTypes.string,
    indentSize: PropTypes.number,
    onExpand: PropTypes.func,
    onExpandedRowsChange: PropTypes.func,
  }

  static defaultProps = {
    expandIconAsCell: false,
    expandedRowClassName: () => '',
    expandIconColumnIndex: 0,
    defaultExpandAllRows: false,
    defaultExpandedRowKeys: [],
    childrenColumnName: 'children',
    indentSize: 15,
    onExpand() {},
    onExpandedRowsChange() {},
  }

  constructor(props) {
    super(props);

    const {
      data,
      childrenColumnName,
      defaultExpandAllRows,
      expandedRowKeys,
      defaultExpandedRowKeys,
      getRowKey,
    } = props;

    let finnalExpandedRowKeys = [];
    let rows = [...data];

    if (defaultExpandAllRows) {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        finnalExpandedRowKeys.push(getRowKey(row, i));
        rows = rows.concat(row[childrenColumnName] || []);
      }
    } else {
      finnalExpandedRowKeys = expandedRowKeys || defaultExpandedRowKeys;
    }

    this.columnManager = props.columnManager;
    this.store = props.store;

    this.store.setState({
      expandedRowsHeight: {},
      expandedRowKeys: finnalExpandedRowKeys,
    });
  }

  componentWillReceiveProps(nextProps) {
    if ('expandedRowKeys' in nextProps) {
      this.store.setState({
        expandedRowKeys: nextProps.expandedRowKeys,
      });
    }
  }

  handleExpandChange = (expanded, record, event, index) => {
    const { expandRowByClick, getRowKey, onExpand } = this.props;

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const info = this.findExpandedRow(record);

    const expandedRows = this.getExpandedRows().concat();

    if (typeof info !== 'undefined' && !expanded) {
      // row was unmounted
      const rowKey = this.props.getRowKey(record, index);
      let expandedRowIndex = expandedRows.indexOf(rowKey);
      if (expandedRowIndex !== -1) {
        expandedRows.splice(expandedRowIndex, 1);
      }
      this.updateExpandedRows(expandedRows);
    } else if (!info && expanded) {
      // row was collapse
      expandedRows.push(getRowKey(record, index));
      this.updateExpandedRows(expandedRows);
    }
    onExpand(expanded, record);
  }

  updateExpandedRows(expandedRowKeys) {
    if (!this.props.expandedRowKeys) {
      this.store.setState({ expandedRowKeys });
    }
    this.props.onExpandedRowsChange(expandedRowKeys);
  }

  findExpandedRow(record, index) {
    const rows = this.getExpandedRows().filter(i => i === this.props.getRowKey(record, index));
    return rows[0];
  }

  getExpandedRows() {
    return this.store.getState().expandedRowKeys;
  }

  isRowExpanded(record, index) {
    return typeof this.findExpandedRow(record, index) !== 'undefined';
  }

  renderExpandedRow(parentKey, content, className, fixed) {
    const { prefixCls, expandIconAsCell } = this.props;
    let colCount;
    if (fixed === 'left') {
      colCount = this.columnManager.leftLeafColumns().length;
    } else if (fixed === 'right') {
      colCount = this.columnManager.rightLeafColumns().length;
    } else {
      colCount = this.columnManager.leafColumns().length;
    }
    const columns = [{
      key: 'extra-row',
      render: () => ({
        props: {
          colSpan: colCount,
        },
        children: fixed !== 'right' ? content : '&nbsp;',
      }),
    }];
    if (expandIconAsCell && fixed !== 'right') {
      columns.unshift({
        key: 'expand-icon-placeholder',
        render: () => null,
      });
    }

    const rowKey = `${parentKey}-extra-row`;

    return (
      <ExpandedRowHeigh
        store={this.store}
        key={rowKey}
        rowKey={rowKey}
        fixed={!!fixed}
      >
        {({ height, saveRowRef }) => (
          <ExpandedRowVisible
            store={this.store}
            rowKey={rowKey}
            parentKey={rowKey}
          >
            {visible => (
              <TableRow
                columns={columns}
                className={className}
                rowKey={rowKey}
                parentKey={parentKey}
                prefixCls={`${prefixCls}-expanded-row`}
                indent={1}
                expandable={false}
                store={this.store}
                fixed={!!fixed}
                height={height}
                visible={visible}
                saveRowRef={saveRowRef}
              />
            )}
          </ExpandedRowVisible>
        )}
      </ExpandedRowHeigh>
    );
  }

  renderRows = (renderRows, record, index, indent, fixed, parentKey) => {
    const { expandedRowClassName, columns, expandedRowRender, childrenColumnName } = this.props;
    const childrenData = record[childrenColumnName];
    const expanded = this.isRowExpanded(record, index);
    const expandedRowContent = (expandedRowRender && expanded) ?
      expandedRowRender(record, index, indent)  : null;

    if (expandedRowContent && expanded) {
      return [
        this.renderExpandedRow(
          parentKey,
          expandedRowContent,
          expandedRowClassName(record, index, indent),
          fixed,
        )
      ];
    }

    if (childrenData) {
      return renderRows(
        childrenData,
        indent + 1,
        columns,
        fixed,
        parentKey,
      );
    }
  }

  render() {
    const { data, childrenColumnName, children } = this.props;
    const needIndentSpaced = data.some(record => record[childrenColumnName]);

    return children({
      props: this.props,
      renderRows: this.renderRows,
      needIndentSpaced,
      handleExpandChange: this.handleExpandChange,
    });
  }
}