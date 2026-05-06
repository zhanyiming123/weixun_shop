import { describe, expect, it } from 'vitest';
import {
  buildConditionCardDrafts,
  buildConditionCatalogOptions,
  buildConditionFormStateFromCardDrafts,
  createEmptyConditionCardDraft,
} from './condition-cards';

describe('coupon condition cards helpers', () => {
  it('hydrates ordered card drafts from stored condition values', () => {
    const drafts = buildConditionCardDrafts(
      [
        ['weixun-mall'],
        ['weixun-course', 'international'],
      ],
      [
        {
          catalogPath: ['weixun-course', 'international'],
          ownershipPaths: [['study-abroad']],
          specAttributeId: 'spec-course',
          specValue: '直播班',
        },
      ]
    );

    expect(drafts).toEqual([
      {
        catalogPath: ['weixun-mall'],
        ownershipPaths: [],
        specAttributeId: undefined,
        specValue: undefined,
      },
      {
        catalogPath: ['weixun-course', 'international'],
        ownershipPaths: [['study-abroad']],
        specAttributeId: 'spec-course',
        specValue: '直播班',
      },
    ]);
  });

  it('builds form state from non-empty cards only', () => {
    const formState = buildConditionFormStateFromCardDrafts([
      createEmptyConditionCardDraft(),
      {
        catalogPath: ['weixun-course', 'international'],
        ownershipPaths: [['study-abroad']],
        specAttributeId: 'spec-course',
        specValue: '直播班',
      },
      {
        catalogPath: ['weixun-mall'],
        ownershipPaths: [],
        specAttributeId: undefined,
        specValue: undefined,
      },
    ]);

    expect(formState).toEqual({
      conditionCategoryPaths: [
        ['weixun-course', 'international'],
        ['weixun-mall'],
      ],
      conditionOwnershipSelections: [
        {
          catalogPath: ['weixun-course', 'international'],
          ownershipPaths: [['study-abroad']],
          specAttributeId: 'spec-course',
          specValue: '直播班',
        },
      ],
    });
  });

  it('disables catalog paths already selected by other cards', () => {
    const options = buildConditionCatalogOptions(
      [
        {
          value: 'weixun-course',
          label: '唯寻课程',
          children: [
            { value: 'international', label: '国际课程' },
            { value: 'planning', label: '升学规划' },
          ],
        },
      ],
      [
        ['weixun-course', 'international'],
        ['weixun-course', 'planning'],
      ],
      ['weixun-course', 'international']
    );

    expect(options).toEqual([
      {
        value: 'weixun-course',
        label: '唯寻课程',
        disabled: false,
        children: [
          {
            value: 'international',
            label: '国际课程',
            disabled: false,
            children: undefined,
          },
          {
            value: 'planning',
            label: '升学规划',
            disabled: true,
            children: undefined,
          },
        ],
      },
    ]);
  });
});
