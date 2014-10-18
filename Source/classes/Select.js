/**
 * Select
 */
Garnish.Select = Garnish.Base.extend({

	// Properties
	// =========================================================================

	$container: null,
	$items: null,
	$selectedItems: null,

	mousedownX: null,
	mousedownY: null,
	mouseUpTimeout: null,
	callbackFrame: null,

	$focusable: null,
	$first: null,
	first: null,
	$last: null,
	last: null,

	// Public methods
	// =========================================================================

	/**
	 * Constructor
	 */
	init: function(container, items, settings)
	{
		this.$container = $(container);

		// Param mapping
		if (!settings && $.isPlainObject(items))
		{
			// (container, settings)
			settings = items;
			items = null;
		}

		// Is this already a select?
		if (this.$container.data('select'))
		{
			Garnish.log('Double-instantiating a select on an element');
			this.$container.data('select').destroy();
		}

		this.$container.data('select', this);

		this.setSettings(settings, Garnish.Select.defaults);

		this.$items = $();
		this.$selectedItems = $();

		this.addItems(items);

		// --------------------------------------------------------------------

		this.addListener(this.$container, 'click', function(ev)
		{
			if (this.ignoreClick)
			{
				this.ignoreClick = false;
			}
			else
			{
				// deselect all items on container click
				this.deselectAll(true);
			}
		});
	},

	// --------------------------------------------------------------------

	/**
	 * Get Item Index
	 */
	getItemIndex: function($item)
	{
		return this.$items.index($item[0]);
	},

	/**
	 * Is Selected?
	 */
	isSelected: function(item)
	{
		if (Garnish.isJquery(item))
		{
			if (!item[0])
			{
				return false;
			}

			item = item[0];
		}

		return ($.inArray(item, this.$selectedItems) != -1);
	},

	/**
	 * Select Item
	 */
	selectItem: function($item)
	{
		if (!this.settings.multi)
		{
			this.deselectAll();
		}

		this.$first = this.$last = $item;
		this.first = this.last = this.getItemIndex($item);

		this.setFocusableItem($item);
		$item.focus();

		this._selectItems($item);
	},

	selectAll: function()
	{
		if (!this.settings.multi || !this.$items.length)
		{
			return;
		}

		this.first = 0;
		this.last = this.$items.length-1;
		this.$first = $(this.$items[this.first]);
		this.$last = $(this.$items[this.last]);

		this._selectItems(this.$items);
	},

	/**
	 * Select Range
	 */
	selectRange: function($item)
	{
		if (!this.settings.multi)
		{
			return this.selectItem($item);
		}

		this.deselectAll();

		this.$last = $item;
		this.last = this.getItemIndex($item);

		this.setFocusableItem($item);
		$item.focus();

		// prepare params for $.slice()
		if (this.first < this.last)
		{
			var sliceFrom = this.first,
				sliceTo = this.last + 1;
		}
		else
		{
			var sliceFrom = this.last,
				sliceTo = this.first + 1;
		}

		this._selectItems(this.$items.slice(sliceFrom, sliceTo));
	},

	/**
	 * Deselect Item
	 */
	deselectItem: function($item)
	{
		var index = this.getItemIndex($item);
		if (this.first === index) this.$first = this.first = null;
		if (this.last === index) this.$last = this.last = null;

		this._deselectItems($item);
	},

	/**
	 * Deselect All
	 */
	deselectAll: function(clearFirst)
	{
		if (clearFirst)
		{
			this.$first = this.first = this.$last = this.last = null;
		}

		this._deselectItems(this.$items);
	},

	/**
	 * Deselect Others
	 */
	deselectOthers: function($item)
	{
		this.deselectAll();
		this.selectItem($item);
	},

	/**
	 * Toggle Item
	 */
	toggleItem: function($item)
	{
		if (! this.isSelected($item))
		{
			this.selectItem($item);
		}
		else
		{
			this.deselectItem($item);
		}
	},

	// --------------------------------------------------------------------

	clearMouseUpTimeout: function()
	{
		clearTimeout(this.mouseUpTimeout);
	},

	getFirstItem: function()
	{
		if (this.$items.length)
		{
			return $(this.$items[0]);
		}
	},

	getLastItem: function()
	{
		if (this.$items.length)
		{
			return $(this.$items[this.$items.length-1]);
		}
	},

	isPreviousItem: function(index)
	{
		return (index > 0);
	},

	isNextItem: function(index)
	{
		return (index < this.$items.length-1);
	},

	getPreviousItem: function(index)
	{
		if (this.isPreviousItem(index))
		{
			return $(this.$items[index-1]);
		}
	},

	getNextItem: function(index)
	{
		if (this.isNextItem(index))
		{
			return $(this.$items[index+1]);
		}
	},

	getItemToTheLeft: function(index)
	{
		var func = (Garnish.ltr ? 'Previous' : 'Next');

		if (this['is'+func+'Item'](index))
		{
			if (this.settings.horizontal)
			{
				return this['get'+func+'Item'](index);
			}
			if (!this.settings.vertical)
			{
				return this.getClosestItem(index, Garnish.X_AXIS, '<');
			}
		}
	},

	getItemToTheRight: function(index)
	{
		var func = (Garnish.ltr ? 'Next' : 'Previous');

		if (this['is'+func+'Item'](index))
		{
			if (this.settings.horizontal)
			{
				return this['get'+func+'Item'](index);
			}
			else if (!this.settings.vertical)
			{
				return this.getClosestItem(index, Garnish.X_AXIS, '>');
			}
		}
	},

	getItemAbove: function(index)
	{
		if (this.isPreviousItem(index))
		{
			if (this.settings.vertical)
			{
				return this.getPreviousItem(index);
			}
			else if (!this.settings.horizontal)
			{
				return this.getClosestItem(index, Garnish.Y_AXIS, '<');
			}
		}
	},

	getItemBelow: function(index)
	{
		if (this.isNextItem(index))
		{
			if (this.settings.vertical)
			{
				return this.getNextItem(index);
			}
			else if (!this.settings.horizontal)
			{
				return this.getClosestItem(index, Garnish.Y_AXIS, '>');
			}
		}
	},

	getClosestItem: function(index, axis, dir)
	{
		var axisProps = Garnish.Select.closestItemAxisProps[axis],
			dirProps = Garnish.Select.closestItemDirectionProps[dir];

		var $thisItem = $(this.$items[index]),
			thisOffset = $thisItem.offset(),
			thisMidpoint = thisOffset[axisProps.midpointOffset] + Math.round($thisItem[axisProps.midpointSizeFunc]()/2),
			otherRowPos = null,
			smallestMidpointDiff = null,
			$closestItem = null;

		// Go the other way if this is the X axis and a RTL page
		if (Garnish.rtl && axis == Garnish.X_AXIS)
		{
			var step = dirProps.step * -1;
		}
		else
		{
			var step = dirProps.step;
		}

		for (var i = index + step; (typeof this.$items[i] != 'undefined'); i += step)
		{
			var $otherItem = $(this.$items[i]),
				otherOffset = $otherItem.offset();

			// Are we on the next row yet?
			if (dirProps.isNextRow(otherOffset[axisProps.rowOffset], thisOffset[axisProps.rowOffset]))
			{
				// Is this the first time we've seen this row?
				if (otherRowPos === null)
				{
					otherRowPos = otherOffset[axisProps.rowOffset];
				}
				// Have we gone too far?
				else if (otherOffset[axisProps.rowOffset] != otherRowPos)
				{
					break;
				}

				var otherMidpoint = otherOffset[axisProps.midpointOffset] + Math.round($otherItem[axisProps.midpointSizeFunc]()/2),
					midpointDiff = Math.abs(thisMidpoint - otherMidpoint);

				// Are we getting warmer?
				if (smallestMidpointDiff === null || midpointDiff < smallestMidpointDiff)
				{
					smallestMidpointDiff = midpointDiff;
					$closestItem = $otherItem;
				}
				// Getting colder?
				else
				{
					break;
				}
			}
			// Getting colder?
			else if (dirProps.isWrongDirection(otherOffset[axisProps.rowOffset], thisOffset[axisProps.rowOffset]))
			{
				break;
			}
		}

		return $closestItem;
	},

	getFurthestItemToTheLeft: function(index)
	{
		return this.getFurthestItem(index, 'ToTheLeft');
	},

	getFurthestItemToTheRight: function(index)
	{
		return this.getFurthestItem(index, 'ToTheRight');
	},

	getFurthestItemAbove: function(index)
	{
		return this.getFurthestItem(index, 'Above');
	},

	getFurthestItemBelow: function(index)
	{
		return this.getFurthestItem(index, 'Below');
	},

	getFurthestItem: function(index, dir)
	{
		var $item, $testItem;

		while ($testItem = this['getItem'+dir](index))
		{
			$item = $testItem;
			index = this.getItemIndex($item);
		}

		return $item;
	},

	// --------------------------------------------------------------------

	/**
	 * totalSelected getter
	 */
	get totalSelected()
	{
		return this.getTotalSelected();
	},

	/**
	 * Get Total Selected
	 */
	getTotalSelected: function()
	{
		return this.$selectedItems.length;
	},

	/**
	 * Add Items
	 */
	addItems: function(items)
	{
		var $items = $(items);

		for (var i = 0; i < $items.length; i++)
		{
			var item = $items[i];

			// Make sure this element doesn't belong to another selector
			if ($.data(item, 'select'))
			{
				Garnish.log('Element was added to more than one selector');
				$.data(item, 'select').removeItems(item);
			}

			// Add the item
			$.data(item, 'select', this);
			this.$items = this.$items.add(item);

			// Get the handle
			if (this.settings.handle)
			{
				if (typeof this.settings.handle == 'object')
				{
					var $handle = $(this.settings.handle);
				}
				else if (typeof this.settings.handle == 'string')
				{
					var $handle = $(item).find(this.settings.handle);
				}
				else if (typeof this.settings.handle == 'function')
				{
					var $handle = $(this.settings.handle(item));
				}
			}
			else
			{
				var $handle = $(item);
			}

			$.data(item, 'select-handle', $handle);
			$handle.data('select-item', item);

			this.addListener($handle, 'mousedown', 'onMouseDown');
			this.addListener($handle, 'mouseup', 'onMouseUp');
			this.addListener($handle, 'keydown', 'onKeyDown');
			this.addListener($handle, 'click', function(ev)
			{
				this.ignoreClick = true;
			});
		}

		this.updateIndexes();
	},

	/**
	 * Remove Items
	 */
	removeItems: function(items)
	{
		items = $.makeArray(items);

		for (var i = 0; i < items.length; i++)
		{
			var item = items[i];

			// Make sure we actually know about this item
			var index = $.inArray(item, this.$items);
			if (index != -1)
			{
				this._deinitItem(item);
				this.$items.splice(index, 1);
			}
		}

		this.updateIndexes();
	},

	/**
	 * Remove All Items
	 */
	removeAllItems: function()
	{
		for (var i = 0; i < this.$items.length; i++)
		{
			this._deinitItem(this.$items[i]);
		}

		this.$items = $();
		this.updateIndexes();
	},

	/**
	 * Update First/Last indexes
	 */
	updateIndexes: function()
	{
		if (this.first !== null)
		{
			this.first = this.getItemIndex(this.$first);
			this.last = this.getItemIndex(this.$last);
			this.setFocusableItem(this.$first);
		}
		else if (this.$items.length)
		{
			this.setFocusableItem($(this.$items[0]));
		}
	},

	/**
	 * Reset Item Order
	 */
	 resetItemOrder: function()
	 {
	 	this.$items = $().add(this.$items);
	 	this.updateIndexes();
	 },

	/**
	 * Sets the focusable item.
	 *
	 * We only want to have one focusable item per selection list, so that the user
	 * doesn't have to tab through a million items.
	 *
	 * @param object $item
	 */
	setFocusableItem: function($item)
	{
		if (this.$focusable)
		{
			this.$focusable.removeAttr('tabindex');
		}

		this.$focusable = $item.attr('tabindex', '0');
	},

	// --------------------------------------------------------------------

	/**
	 * Get Selected Items
	 */
	getSelectedItems: function()
	{
		return this.$selectedItems;
	},

	/**
	 * Destroy
	 */
	destroy: function()
	{
		this.$container.removeData('select');
		this.removeAllItems();
		this.base();
	},

	// Events
	// -------------------------------------------------------------------------

	/**
	 * On Mouse Down
	 */
	onMouseDown: function(ev)
	{
		// ignore right clicks
		if (ev.which != Garnish.PRIMARY_CLICK)
		{
			return;
		}

		// Enforce the filter
		if (this.settings.filter && !$(ev.target).is(this.settings.filter))
		{
			return;
		}

		this.mousedownX = ev.pageX;
		this.mousedownY = ev.pageY;

		var $item = $($.data(ev.currentTarget, 'select-item'));

		if (ev.metaKey || ev.ctrlKey)
		{
			this.toggleItem($item);
		}
		else if (this.first !== null && ev.shiftKey)
		{
			this.selectRange($item);
		}
	},

	/**
	 * On Mouse Up
	 */
	onMouseUp: function(ev)
	{
		// ignore right clicks
		if (ev.which != Garnish.PRIMARY_CLICK)
		{
			return;
		}

		// Enfore the filter
		if (this.settings.filter && !$(ev.target).is(this.settings.filter))
		{
			return;
		}

		var $item = $($.data(ev.currentTarget, 'select-item'));

		// was this a click?
		if (! (ev.metaKey || ev.ctrlKey) && ! ev.shiftKey && Garnish.getDist(this.mousedownX, this.mousedownY, ev.pageX, ev.pageY) < 1)
		{
			// If this is already selected, wait a moment to see if this is a double click before making any rash decisions
			if (this.isSelected($item))
			{
				this.clearMouseUpTimeout();

				this.mouseUpTimeout = setTimeout($.proxy(function() {
					this.deselectOthers($item);
				}, this), 300);
			}
			else
			{
				this.deselectAll();
				this.selectItem($item);
			}
		}
	},

	/**
	 * On Key Down
	 */
	onKeyDown: function(ev)
	{
		var metaKey = (ev.metaKey || ev.ctrlKey);

		if (this.settings.arrowsChangeSelection || !this.$focusable.length)
		{
			var anchor = ev.shiftKey ? this.last : this.first;
		}
		else
		{
			var anchor = $.inArray(this.$focusable[0], this.$items);

			if (anchor == -1)
			{
				anchor = 0;
			}
		}

		// Ok, what are we doing here?
		switch (ev.keyCode)
		{
			case Garnish.LEFT_KEY:
			{
				ev.preventDefault();

				// Select the last item if none are selected
				if (this.first === null)
				{
					if (Garnish.ltr)
					{
						var $item = this.getLastItem();
					}
					else
					{
						var $item = this.getFirstItem();
					}
				}
				else
				{
					if (metaKey)
					{
						var $item = this.getFurthestItemToTheLeft(anchor);
					}
					else
					{
						var $item = this.getItemToTheLeft(anchor);
					}
				}

				break;
			}

			case Garnish.RIGHT_KEY:
			{
				ev.preventDefault();

				// Select the first item if none are selected
				if (this.first === null)
				{
					if (Garnish.ltr)
					{
						var $item = this.getFirstItem();
					}
					else
					{
						var $item = this.getLastItem();
					}
				}
				else
				{
					if (metaKey)
					{
						var $item = this.getFurthestItemToTheRight(anchor);
					}
					else
					{
						var $item = this.getItemToTheRight(anchor);
					}
				}

				break;
			}

			case Garnish.UP_KEY:
			{
				ev.preventDefault();

				// Select the last item if none are selected
				if (this.first === null)
				{
					var $item = this.getLastItem();
				}
				else
				{
					if (metaKey)
					{
						var $item = this.getFurthestItemAbove(anchor);
					}
					else
					{
						var $item = this.getItemAbove(anchor);
					}

					if (!$item)
					{
						$item = this.getFirstItem();
					}
				}

				break;
			}

			case Garnish.DOWN_KEY:
			{
				ev.preventDefault();

				// Select the first item if none are selected
				if (this.first === null)
				{
					var $item = this.getFirstItem();
				}
				else
				{
					if (metaKey)
					{
						var $item = this.getFurthestItemBelow(anchor);
					}
					else
					{
						var $item = this.getItemBelow(anchor);
					}

					if (!$item)
					{
						$item = this.getLastItem();
					}
				}

				break;
			}

			case Garnish.SPACE_KEY:
			{
				if (!metaKey)
				{
					ev.preventDefault();

					if (this.isSelected(this.$focusable))
					{
						this.deselectItem(this.$focusable);
					}
					else
					{
						this.selectItem(this.$focusable);
					}
				}

				break;
			}

			case Garnish.A_KEY:
			{
				if (metaKey)
				{
					ev.preventDefault();
					this.selectAll();
				}

				break;
			}
		}

		// Is there an item queued up for focus/selection?
		if ($item && $item.length)
		{
			if (this.settings.arrowsChangeSelection)
			{
				// select it
				if (this.first !== null && ev.shiftKey)
				{
					this.selectRange($item);
				}
				else
				{
					this.deselectAll();
					this.selectItem($item);
				}
			}
			else
			{
				// just set the new item to be focussable
				this.setFocusableItem($item);
				$item.focus();
			}
		}
	},

	/**
	 * Set Callback Timeout
	 */
	onSelectionChange: function()
	{
		if (this.callbackFrame)
		{
			Garnish.cancelAnimationFrame(this.callbackFrame);
			this.callbackFrame = null;
		}

		this.callbackFrame = Garnish.requestAnimationFrame($.proxy(function()
		{
			this.callbackFrame = null;
			this.trigger('selectionChange');
			this.settings.onSelectionChange();
		}, this));
	},

	// Private methods
	// =========================================================================

	_selectItems: function($items)
	{
		$items.addClass(this.settings.selectedClass);
		this.$selectedItems = this.$selectedItems.add($items);
		this.onSelectionChange();
	},

	_deselectItems: function($items)
	{
		$items.removeClass(this.settings.selectedClass);
		this.$selectedItems = this.$selectedItems.not($items);
		this.onSelectionChange();
	},

	/**
	 * Deinitialize an item.
	 */
	_deinitItem: function(item)
	{
		var $handle = $.data(item, 'select-handle');

		if ($handle)
		{
			$handle.removeData('select-item');
			this.removeAllListeners($handle);
		}

		$.removeData(item, 'select');
		$.removeData(item, 'select-handle');
	}
},

// Static Properties
// =============================================================================

{
	defaults: {
		selectedClass: 'sel',
		multi: false,
		vertical: false,
		horizontal: false,
		arrowsChangeSelection: true,
		handle: null,
		filter: null,
		onSelectionChange: $.noop
	},

	closestItemAxisProps: {
		x: {
			midpointOffset:   'top',
			midpointSizeFunc: 'outerHeight',
			rowOffset:        'left'
		},
		y: {
			midpointOffset:   'left',
			midpointSizeFunc: 'outerWidth',
			rowOffset:        'top'
		}
	},

	closestItemDirectionProps: {
		'<': {
			step: -1,
			isNextRow: function(a, b) { return (a < b); },
			isWrongDirection: function(a, b) { return (a > b); }
		},
		'>': {
			step: 1,
			isNextRow: function(a, b) { return (a > b); },
			isWrongDirection: function(a, b) { return (a < b); }
		}
	}
});
