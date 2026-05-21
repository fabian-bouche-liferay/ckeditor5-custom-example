import {Plugin, Command} from '@ckeditor/ckeditor5-core/dist/index.js';

import {
	Widget,
	toWidget,
	toWidgetEditable,
} from '@ckeditor/ckeditor5-widget/dist/index.js';

import {
	ButtonView,
	createDropdown,
} from '@ckeditor/ckeditor5-ui/dist/index.js';

const CALLOUT_VARIANTS = ['info', 'warning', 'success', 'danger'];

const CALLOUT_DEFAULT_TITLES = {
	info: 'Info:',
	warning: 'Warning:',
	success: 'Success:',
	danger: 'Error:',
};

const CALLOUT_DEFAULT_CONTENT = {
	info: 'This is an info message',
	warning: 'This is a warning message',
	success: 'This is a success message',
	danger: 'This is an error message',
};

function normalizeVariant(variant) {
	return CALLOUT_VARIANTS.includes(variant) ? variant : 'info';
}

function getDefaultTitle(variant) {
	return CALLOUT_DEFAULT_TITLES[normalizeVariant(variant)];
}

function getDefaultContent(variant) {
	return CALLOUT_DEFAULT_CONTENT[normalizeVariant(variant)];
}

export default class Callout extends Plugin {
	static get requires() {
		return [CalloutEditing, CalloutUI];
	}
}

class CalloutEditing extends Plugin {
	static get requires() {
		return [Widget];
	}

	init() {
		const editor = this.editor;
		const schema = editor.model.schema;

		schema.register('callout', {
			inheritAllFrom: '$blockObject',
			allowAttributes: ['variant'],
		});

		schema.register('calloutTitle', {
			isLimit: true,
			allowIn: 'callout',
			allowContentOf: '$block',
		});

		schema.register('calloutContent', {
			isLimit: true,
			allowIn: 'callout',
			allowContentOf: '$root',
		});

		editor.commands.add(
			'insertCallout',
			new InsertCalloutCommand(editor)
		);

		defineConverters(editor);
		injectEditorStyles();
	}
}

class InsertCalloutCommand extends Command {
	execute({variant = 'warning'} = {}) {
		const editor = this.editor;

		variant = normalizeVariant(variant);

		editor.model.change((writer) => {
			const callout = writer.createElement('callout', {
				variant,
			});

			const title = writer.createElement('calloutTitle');
			const content = writer.createElement('calloutContent');
			const paragraph = writer.createElement('paragraph');

			writer.appendText(
				getDefaultTitle(variant),
				title
			);

			writer.appendText(
				getDefaultContent(variant),
				paragraph
			);

			writer.append(title, callout);

			writer.append(paragraph, content);

			writer.append(content, callout);

			editor.model.insertContent(callout);

			writer.setSelection(paragraph, 'in');
		});
	}

	refresh() {
		const model = this.editor.model;
		const selection = model.document.selection;

		const allowedParent = model.schema.findAllowedParent(
			selection.getFirstPosition(),
			'callout'
		);

		this.isEnabled = allowedParent !== null;
	}
}

function defineConverters(editor) {
	const conversion = editor.conversion;

	/*
	 * UPCAST
	 */

	conversion.for('upcast').elementToElement({
		view: {
			name: 'div',
			classes: 'alert',
		},
		model: (viewElement, {writer}) => {
			const variantClass = CALLOUT_VARIANTS.find((variant) =>
				viewElement.hasClass(`alert-${variant}`)
			);

			return writer.createElement('callout', {
				variant: normalizeVariant(variantClass),
			});
		},
	});

	conversion.for('upcast').elementToElement({
		view: {
			name: 'strong',
			classes: 'lead',
		},
		model: 'calloutTitle',
	});

	conversion.for('upcast').elementToElement({
		view: {
			name: 'span',
		},
		model: 'calloutContent',
	});

	/*
	 * DATA DOWNCAST
	 */

	conversion.for('dataDowncast').elementToElement({
		model: 'callout',
		view: (modelElement, {writer}) => {
			const variant = normalizeVariant(
				modelElement.getAttribute('variant') || 'info'
			);

			return writer.createContainerElement('div', {
				class: `alert alert-${variant}`,
			});
		},
	});

	conversion.for('dataDowncast').elementToElement({
		model: 'calloutTitle',
		view: (modelElement, {writer}) => {
			return writer.createContainerElement('strong', {
				class: 'lead',
			});
		},
	});

	conversion.for('dataDowncast').elementToElement({
		model: 'calloutContent',
		view: (modelElement, {writer}) => {
			return writer.createContainerElement('span');
		},
	});

	/*
	 * EDITING DOWNCAST
	 */

	conversion.for('editingDowncast').elementToElement({
		model: 'callout',
		view: (modelElement, {writer}) => {
			const variant = normalizeVariant(
				modelElement.getAttribute('variant') || 'info'
			);

			const div = writer.createContainerElement('div', {
				class: `alert alert-${variant} ck-callout`,
			});

			const indicator = writer.createUIElement(
				'span',
				{
					class: 'alert-indicator',
				},
				function (domDocument) {
					const domElement =
						this.toDomElement(domDocument);

					domElement.textContent = '...';

					return domElement;
				}
			);

			writer.insert(
				writer.createPositionAt(div, 0),
				indicator
			);

			return toWidget(div, writer, {
				label: 'callout widget',
			});
		},
	});

	conversion.for('editingDowncast').elementToElement({
		model: 'calloutTitle',
		view: (modelElement, {writer}) => {
			const strong = writer.createEditableElement(
				'strong',
				{
					class: 'lead ck-callout-title',
				}
			);

			return toWidgetEditable(strong, writer);
		},
	});

	conversion.for('editingDowncast').elementToElement({
		model: 'calloutContent',
		view: (modelElement, {writer}) => {
			const span = writer.createEditableElement(
				'span',
				{
					class: 'ck-callout-content',
				}
			);

			return toWidgetEditable(span, writer);
		},
	});
}

class CalloutUI extends Plugin {
	init() {
		const editor = this.editor;
		const t = editor.t;

		editor.ui.componentFactory.add(
			'callout',
			(locale) => {
				const dropdownView =
					createDropdown(locale);

				const command =
					editor.commands.get(
						'insertCallout'
					);

				dropdownView.buttonView.set({
					label: t('Callout'),
					withText: true,
					tooltip: true,
				});

				dropdownView.bind(
					'isEnabled'
				).to(command, 'isEnabled');

				[
					['Info', 'info'],
					['Warning', 'warning'],
					['Success', 'success'],
					['Danger', 'danger'],
				].forEach(([label, variant]) => {
					const button =
						new ButtonView(locale);

					button.set({
						label,
						withText: true,
					});

					button.on(
						'execute',
						() => {
							editor.execute(
								'insertCallout',
								{
									variant,
								}
							);

							editor.editing.view.focus();

							dropdownView.isOpen =
								false;
						}
					);

					dropdownView.panelView.children.add(
						button
					);
				});

				return dropdownView;
			}
		);
	}
}

function injectEditorStyles() {
	if (
		document.getElementById(
			'ckeditor-callout-styles'
		)
	) {
		return;
	}

	const style = document.createElement('style');

	style.id = 'ckeditor-callout-styles';

	style.innerHTML = `
		.ck-content .ck-callout {
			display: block;
			margin: 16px 0;
		}

		.ck-content .ck-callout-title {
			outline: none;
			margin-right: 4px;
		}

		.ck-content .ck-callout-content {
			outline: none;
		}
	`;

	document.head.appendChild(style);
}