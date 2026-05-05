/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Plugin} from '@ckeditor/ckeditor5-core/dist/index.js';
import {Fullscreen} from '@ckeditor/ckeditor5-fullscreen/dist/index.js';
import {ButtonView} from '@ckeditor/ckeditor5-ui/dist/index.js';
import {Emoji} from '@ckeditor/ckeditor5-emoji/dist/index.js';
import {Mention} from '@ckeditor/ckeditor5-mention/dist/index.js';
import {Indent, IndentBlock} from '@ckeditor/ckeditor5-indent/dist/index.js';
import {LinkImage} from '@ckeditor/ckeditor5-link/dist/index.js';
import {
	SpecialCharacters,
	SpecialCharactersEssentials,
} from '@ckeditor/ckeditor5-special-characters/dist/index.js';
import {
	Table,
	TableCellProperties,
	TableColumnResize,
	TableProperties,
	TableToolbar,
} from '@ckeditor/ckeditor5-table/dist/index.js';
import {
	EditorConfigTransformer,
	EditorTransformer,
} from '@liferay/js-api/editor';

const unique = <T>(items: T[]) => [...new Set(items)];

const editorConfigTransformer: EditorConfigTransformer<any> = (config) => {

	// CKEditor 5

	if (config?.editorType === 'ckeditor5') {
		class HelloWorld extends Plugin {
			init() {
				const editor = this.editor;

				editor.ui.componentFactory.add('helloworld', () => {
					const button = new ButtonView();

					button.set({
						label: 'Hello',
						withText: true,
					});

					button.on('execute', () => {
						editor.model.change((writer) => {
							editor.model.insertContent(
								writer.createText('Hello World!?!')
							);
						});
					});

					return button;
				});
			}
		}

		return {
			...config,

			extraPlugins: unique([
				...(config.extraPlugins || []),
				Fullscreen,
				Mention,
				Emoji,
				SpecialCharacters,
				SpecialCharactersEssentials,
				HelloWorld,
				Table,
				TableToolbar,
				TableProperties,
				TableCellProperties,
				TableColumnResize,
				Indent,
				IndentBlock,
				LinkImage,
			]),

			image: {
				...(config.image || {}),
				toolbar: unique([
					...(config.image?.toolbar || []),
					'linkImage',
				]),
			},

			table: {
				...(config.table || {}),

				contentToolbar: unique([
					...(config.table?.contentToolbar || []),
					'tableColumn',
					'tableRow',
					'mergeTableCells',
					'tableProperties',
					'tableCellProperties',
				]),
			},

			toolbar: {
				...(typeof config.toolbar === 'object' && !Array.isArray(config.toolbar)
					? config.toolbar
					: {}),

				items: unique([
					...(Array.isArray(config.toolbar)
						? config.toolbar
						: config.toolbar?.items || []),
					'fullscreen',
					'emoji',
					'specialCharacters',
					'insertTable',
					'outdent',
					'indent',
					'helloworld',
				]),
			},
		};
	}

	// Alloy Editor

	const toolbars: any = config.toolbars;

	if (typeof toolbars === 'object') {
		interface ISelection {
			buttons: Array<string>;
			name: string;
		}

		const textSelection: ISelection = toolbars.styles?.selections?.find(
			(selection: ISelection) => selection.name === 'text'
		);

		if (textSelection?.buttons) {
			textSelection.buttons.push('video');

			return {
				...config,
				toolbars,
			};
		}
	}

	// CKEditor 4

	const toolbar: string | [string[]] = config.toolbar;

	const buttonName = 'AICreator';
	let transformedConfig: any = {...config};

	if (typeof toolbar === 'string') {
		const activeToolbar = config[`toolbar_${toolbar}`];

		if (Array.isArray(activeToolbar)) {
			activeToolbar.push([buttonName]);

			transformedConfig = {
				...config,
				[`toolbar_${toolbar}`]: activeToolbar,
			};
		}
	}
	else if (Array.isArray(toolbar)) {
		toolbar.push([buttonName]);

		transformedConfig = {
			...config,
			toolbar,
		};
	}

	const extraPlugins: string = config.extraPlugins;

	return {
		...transformedConfig,
		extraPlugins: extraPlugins ? `${extraPlugins},aicreator` : 'aicreator',
	};
};

const editorTransformer: EditorTransformer<any> = {
	editorConfigTransformer,
};

export default editorTransformer;