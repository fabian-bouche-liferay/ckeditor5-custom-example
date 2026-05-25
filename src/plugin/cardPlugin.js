import {Plugin, Command} from '@ckeditor/ckeditor5-core/dist/index.js';

import {
	Widget,
	toWidget,
	toWidgetEditable,
} from '@ckeditor/ckeditor5-widget/dist/index.js';

import {ButtonView} from '@ckeditor/ckeditor5-ui/dist/index.js';

const ITEM_SELECTOR_FOLDER_ID_PARAM =
	'_com_liferay_item_selector_web_portlet_ItemSelectorPortlet_folderId';

function createFolderMemory() {
	let lastFolderId = null;

	const isFolderIdEmpty = (folderId) =>
		folderId === null || folderId === undefined || folderId === '';

	return {
		applyTo(url) {
			if (isFolderIdEmpty(lastFolderId)) {
				return url;
			}

			try {
				const parsed = new URL(url, window.location.origin);

				parsed.searchParams.set(
					ITEM_SELECTOR_FOLDER_ID_PARAM,
					String(lastFolderId)
				);

				return parsed.toString();
			}
			catch {
				return url;
			}
		},

		remember(folderId) {
			if (!isFolderIdEmpty(folderId)) {
				lastFolderId = folderId;
			}
		},
	};
}

export default class ClayCard extends Plugin {
	static get requires() {
		return [ClayCardEditing, ClayCardUI];
	}
}

class ClayCardEditing extends Plugin {
	static get requires() {
		return [Widget];
	}

	init() {
		const editor = this.editor;
		const schema = editor.model.schema;

		schema.register('clayCard', {
			inheritAllFrom: '$blockObject',
		});

		schema.register('clayCardImage', {
			isLimit: true,
			allowIn: 'clayCard',
			allowAttributes: ['src', 'alt'],
		});

		schema.register('clayCardBody', {
			isLimit: true,
			allowIn: 'clayCard',
			allowContentOf: '$root',
		});

		schema.register('clayCardTitle', {
			isLimit: true,
			allowIn: 'clayCardBody',
			allowContentOf: '$block',
		});

		schema.register('clayCardText', {
			isLimit: true,
			allowIn: 'clayCardBody',
			allowContentOf: '$root',
		});

		editor.commands.add(
			'insertClayCard',
			new InsertClayCardCommand(editor)
		);

		editor.commands.add(
			'selectClayCardImage',
			new SelectClayCardImageCommand(editor)
		);

		defineConverters(editor);
		injectEditorStyles();
	}
}

class InsertClayCardCommand extends Command {
	execute() {
		const editor = this.editor;

		editor.model.change((writer) => {
			const card = writer.createElement('clayCard');

			const image = writer.createElement('clayCardImage', {
				src: '',
				alt: '',
			});

			const body = writer.createElement('clayCardBody');
			const title = writer.createElement('clayCardTitle');
			const text = writer.createElement('clayCardText');
			const paragraph = writer.createElement('paragraph');

			writer.appendText('Card title', title);
			writer.appendText('Card description', paragraph);

			writer.append(paragraph, text);

			writer.append(image, card);
			writer.append(body, card);

			writer.append(title, body);
			writer.append(text, body);

			editor.model.insertContent(card);

			writer.setSelection(title, 'in');
		});
	}

	refresh() {
		const model = this.editor.model;
		const selection = model.document.selection;

		this.isEnabled =
			model.schema.findAllowedParent(
				selection.getFirstPosition(),
				'clayCard'
			) !== null;
	}
}

class SelectClayCardImageCommand extends Command {
	execute({imageElement = null} = {}) {
		const editor = this.editor;
		const selection = editor.model.document.selection;

		let image = imageElement;

		if (!image) {
			const card =
				selection.getSelectedElement()?.name === 'clayCard'
					? selection.getSelectedElement()
					: selection.getFirstPosition().findAncestor('clayCard');

			if (!card) {
				return;
			}

			image = Array.from(card.getChildren()).find(
				(child) => child.name === 'clayCardImage'
			);
		}

		if (!image) {
			return;
		}

		openCardImageSelector(editor, ({url, alt}) => {
			editor.model.change((writer) => {
				const parent = image.parent;
				const index = image.index;

				const newImage = writer.createElement('clayCardImage', {
					src: url,
					alt: alt || '',
				});

				writer.remove(image);
				writer.insert(newImage, parent, index);
			});

			editor.editing.view.focus();
		});
	}

	refresh() {
		this.isEnabled = true;
	}
}

function defineConverters(editor) {
	const conversion = editor.conversion;

	conversion.for('upcast').elementToElement({
		view: {
			name: 'div',
			classes: 'card',
		},
		model: 'clayCard',
	});

	conversion.for('upcast').elementToElement({
		view: {
			name: 'img',
		},
		model: (viewElement, {writer}) => {
			if (
				!viewElement.hasClass('card-item-first') &&
				!viewElement.hasClass('card-img-top')
			) {
				return null;
			}

			return writer.createElement('clayCardImage', {
				src: viewElement.getAttribute('src') || '',
				alt: viewElement.getAttribute('alt') || '',
			});
		},
	});

	conversion.for('upcast').elementToElement({
		view: {
			name: 'div',
			classes: 'card-body',
		},
		model: 'clayCardBody',
	});

	conversion.for('upcast').elementToElement({
		view: {
			name: 'h4',
			classes: 'card-title',
		},
		model: 'clayCardTitle',
	});

	conversion.for('upcast').elementToElement({
		view: {
			name: 'div',
			classes: 'card-text',
		},
		model: 'clayCardText',
	});

	conversion.for('dataDowncast').elementToElement({
		model: 'clayCard',
		view: (modelElement, {writer}) => {
			return writer.createContainerElement('div', {
				class: 'card',
			});
		},
	});

	conversion.for('dataDowncast').elementToElement({
		model: 'clayCardImage',
		view: (modelElement, {writer}) => {
			const src = modelElement.getAttribute('src');

			if (!src) {
				return writer.createContainerElement('div', {
					class: 'card-item-first card-image-placeholder',
				});
			}

			return writer.createEmptyElement('img', {
				class: 'card-item-first card-img-top',
				src,
				alt: modelElement.getAttribute('alt') || '',
			});
		},
	});

	conversion.for('dataDowncast').elementToElement({
		model: 'clayCardBody',
		view: (modelElement, {writer}) => {
			return writer.createContainerElement('div', {
				class: 'card-body',
			});
		},
	});

	conversion.for('dataDowncast').elementToElement({
		model: 'clayCardTitle',
		view: (modelElement, {writer}) => {
			return writer.createContainerElement('h4', {
				class: 'card-title',
			});
		},
	});

	conversion.for('dataDowncast').elementToElement({
		model: 'clayCardText',
		view: (modelElement, {writer}) => {
			return writer.createContainerElement('div', {
				class: 'card-text',
			});
		},
	});

	conversion.for('editingDowncast').elementToElement({
		model: 'clayCard',
		view: (modelElement, {writer}) => {
			const div = writer.createContainerElement('div', {
				class: 'card ck-clay-card',
			});

			return toWidget(div, writer, {
				label: 'Clay card widget',
			});
		},
	});

	conversion.for('editingDowncast').elementToElement({
		model: 'clayCardImage',
		view: (modelElement, {writer}) => {
			const src = modelElement.getAttribute('src');

			const container = writer.createContainerElement('div', {
				class: 'card-item-first ck-clay-card-image-container',
			});

			if (src) {
				const image = writer.createUIElement(
					'img',
					{
						class:
							'card-img-top ck-clay-card-image ck-clay-card-image-clickable',
						src,
						alt: modelElement.getAttribute('alt') || '',
						title:
							Liferay?.Language?.get?.('change-image') ||
							'Change image',
					},
					function (domDocument) {
						const domElement = this.toDomElement(domDocument);

						domElement.addEventListener('click', (event) => {
							event.preventDefault();

							editor.execute('selectClayCardImage', {
								imageElement: modelElement,
							});

							editor.editing.view.focus();
						});

						return domElement;
					}
				);

				writer.insert(
					writer.createPositionAt(container, 0),
					image
				);
			}
			else {
				const placeholder = writer.createUIElement(
					'button',
					{
						type: 'button',
						class: 'ck-clay-card-image-selector',
					},
					function (domDocument) {
						const domElement =
							this.toDomElement(domDocument);

						domElement.textContent =
							Liferay?.Language?.get?.('select-image') ||
							'Select image';

						domElement.addEventListener('click', (event) => {
							event.preventDefault();

							editor.execute('selectClayCardImage', {
								imageElement: modelElement,
							});

							editor.editing.view.focus();
						});

						return domElement;
					}
				);

				writer.insert(
					writer.createPositionAt(container, 0),
					placeholder
				);
			}

			return container;
		},
	});

	conversion.for('editingDowncast').elementToElement({
		model: 'clayCardBody',
		view: (modelElement, {writer}) => {
			return writer.createContainerElement('div', {
				class: 'card-body ck-clay-card-body',
			});
		},
	});

	conversion.for('editingDowncast').elementToElement({
		model: 'clayCardTitle',
		view: (modelElement, {writer}) => {
			const h4 = writer.createEditableElement('h4', {
				class: 'card-title ck-clay-card-title',
			});

			return toWidgetEditable(h4, writer);
		},
	});

	conversion.for('editingDowncast').elementToElement({
		model: 'clayCardText',
		view: (modelElement, {writer}) => {
			const div = writer.createEditableElement('div', {
				class: 'card-text ck-clay-card-text',
			});

			return toWidgetEditable(div, writer);
		},
	});
}

class ClayCardUI extends Plugin {
	init() {
		const editor = this.editor;
		const t = editor.t;

		editor.ui.componentFactory.add('clayCard', (locale) => {
			const button = new ButtonView(locale);
			const command = editor.commands.get('insertClayCard');

			button.set({
				label: t('Clay Card'),
				withText: true,
				tooltip: true,
			});

			button.bind('isEnabled').to(command, 'isEnabled');

			button.on('execute', () => {
				editor.execute('insertClayCard');
				editor.editing.view.focus();
			});

			return button;
		});
	}
}

const folderMemory = createFolderMemory();

function openCardImageSelector(editor, callback) {
	const config = editor.config;

	const filebrowserImageBrowseUrl = config.get(
		'filebrowserImageBrowseUrl'
	);

	if (!filebrowserImageBrowseUrl) {
		console.warn('Missing CKEditor config: filebrowserImageBrowseUrl');

		return;
	}

	const openSelectionModal =
		Liferay?.Util?.openSelectionModal;

	if (!openSelectionModal) {
		console.warn('Liferay.Util.openSelectionModal is not available');

		return;
	}

	const rememberSelectionFolder = Boolean(
		config.get('itemSelectorRememberSelectionFolder')
	);

	openSelectionModal({
		multiple: false,

		onSelect: (selectedItem) => {
			const value =
				selectedItem?.value ||
				selectedItem?.returnValue ||
				selectedItem;

			const selectedImage = parseSelectedImage(value);

			if (!selectedImage?.url) {
				console.warn('No image URL found from selected item');

				return;
			}

			if (rememberSelectionFolder) {
				folderMemory.remember(selectedItem?.folderId);
			}

			callback(selectedImage);
		},

		selectEventName:
			config.get('itemSelectorEventName') ||
			'itemSelected',

		title:
			Liferay?.Language?.get?.('select-image') ||
			'Select Image',

		url: rememberSelectionFolder
			? folderMemory.applyTo(filebrowserImageBrowseUrl)
			: filebrowserImageBrowseUrl,

		zIndex:
			(Liferay?.zIndex?.WINDOW || 1000) + 10,
	});
}

function parseSelectedImage(value) {
	let parsedValue = value;

	if (typeof value === 'string') {
		try {
			parsedValue = JSON.parse(value);
		}
		catch {
			parsedValue = value;
		}
	}

	if (typeof parsedValue === 'string') {
		return {
			url: parsedValue,
			alt: '',
		};
	}

	if (!parsedValue || typeof parsedValue !== 'object') {
		return null;
	}

	return {
		url:
			parsedValue.url ||
			parsedValue.imageURL ||
			parsedValue.previewURL ||
			parsedValue.defaultURL ||
			parsedValue.fileEntryURL ||
			parsedValue.downloadURL ||
			parsedValue.href ||
			'',

		alt:
			parsedValue.alt ||
			parsedValue.title ||
			parsedValue.name ||
			parsedValue.fileName ||
			'',
	};
}

function injectEditorStyles() {
	if (document.getElementById('ckeditor-clay-card-styles')) {
		return;
	}

	const style = document.createElement('style');

	style.id = 'ckeditor-clay-card-styles';

	style.innerHTML = `
		.ck-content .ck-clay-card {
			display: block;
			margin: 16px 0;
			max-width: 360px;
		}

		.ck-content .ck-clay-card-image-container {
			display: block;
			width: 100%;
			overflow: hidden;
		}

		.ck-content .ck-clay-card-image {
			display: block;
			width: 100%;
			height: auto;
		}

		.ck-content .ck-clay-card-image-clickable {
			cursor: pointer;
		}

		.ck-content .ck-clay-card-image-selector {
			display: block;
			width: 100%;
			min-height: 180px;
			padding: 48px 16px;
			text-align: center;
			cursor: pointer;
			background: #f7f8f9;
			border: 0;
			color: #6b6c7e;
		}

		.ck-content .ck-clay-card-title,
		.ck-content .ck-clay-card-text {
			outline: none;
		}
	`;

	document.head.appendChild(style);
}