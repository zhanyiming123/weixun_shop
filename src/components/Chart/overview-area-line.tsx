import React from 'react';
import { Chart, Line, Axis, Area, Tooltip } from 'bizcharts';
import { Spin } from '@arco-design/web-react';
import CustomTooltip from './customer-tooltip';

function OverviewAreaLine({
  data,
  loading,
  name = '总内容量',
  color = '#4080FF',
  xField = 'date',
  yField = 'count',
  yLabelFormatter = (text: string) => `${Number(text) / 1000}k`,
  valueFormatter = (value: string) => Number(value).toLocaleString(),
}: {
  data: any[];
  loading: boolean;
  name?: string;
  color?: string;
  xField?: string;
  yField?: string;
  yLabelFormatter?: (text: string) => React.ReactNode;
  valueFormatter?: (value: string) => React.ReactNode;
}) {
  return (
    <Spin loading={loading} style={{ width: '100%' }}>
      <Chart
        scale={{ [yField]: { min: 0 } }}
        padding={[10, 20, 50, 40]}
        autoFit
        height={300}
        data={data}
        className={'chart-wrapper'}
      >
        <Axis
          name={yField}
          title
          grid={{
            line: {
              style: {
                lineDash: [4, 4],
              },
            },
          }}
          label={{
            formatter(text) {
              return yLabelFormatter(text);
            },
          }}
        />
        <Axis name={xField} grid={{ line: { style: { stroke: '#E5E8EF' } } }} />
        <Line
          shape="smooth"
          position={`${xField}*${yField}`}
          size={3}
          color="l (0) 0:#1EE7FF .57:#249AFF .85:#6F42FB"
        />
        <Area
          position={`${xField}*${yField}`}
          shape="smooth"
          color="l (90) 0:rgba(17, 126, 255, 0.5)  1:rgba(17, 128, 255, 0)"
        />
        <Tooltip
          showCrosshairs={true}
          showMarkers={true}
          marker={{
            lineWidth: 3,
            stroke: color,
            fill: '#ffffff',
            symbol: 'circle',
            r: 8,
          }}
        >
          {(title, items) => {
            return (
              <CustomTooltip
                title={title}
                data={items}
                color={color}
                name={name}
                formatter={valueFormatter}
              />
            );
          }}
        </Tooltip>
      </Chart>
    </Spin>
  );
}

export default OverviewAreaLine;
