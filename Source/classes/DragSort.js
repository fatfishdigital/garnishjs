/**
 * Drag-to-sort class
 *
 * Builds on the Drag class by allowing you to sort the elements amongst themselves.
 */
Garnish.DragSort = Garnish.Drag.extend({

	// Properties
	// =========================================================================

	$heightedContainer: null,
	$insertion: null,
	insertionVisible: false,
	oldDraggeeIndex: null,
	newDraggeeIndex: null,
	closestItem: null,

	_midpointVersion: 0,
	_$prevItem: null,

	// Public methods
	// =========================================================================

	/**
	 * Constructor
	 *
	 * @param mixed  items    Elements that should be draggable right away. (Can be skipped.)
	 * @param object settings Any settings that should override the defaults.
	 */
	init: function(items, settings)
	{
		// Param mapping
		if (!settings && $.isPlainObject(items))
		{
			// (settings)
			settings = items;
			items = null;
		}

		settings = $.extend({}, Garnish.DragSort.defaults, settings);
		this.base(items, settings);
	},

	/**
	 * Creates the insertion element.
	 */
	createInsertion: function()
	{
		if (this.settings.insertion)
		{
			if (typeof this.settings.insertion == 'function')
			{
				return $(this.settings.insertion(this.$draggee));
			}
			else
			{
				return $(this.settings.insertion);
			}
		}
	},

	/**
	 * Returns the helper’s target X position
	 */
	getHelperTargetX: function()
	{
		if (this.settings.magnetStrength != 1)
		{
			this.getHelperTargetX._draggeeOffsetX = this.$draggee.offset().left;
			return this.getHelperTargetX._draggeeOffsetX + ((this.mouseX - this.mouseOffsetX - this.getHelperTargetX._draggeeOffsetX) / this.settings.magnetStrength);
		}
		else
		{
			return this.base();
		}
	},

	/**
	 * Returns the helper’s target Y position
	 */
	getHelperTargetY: function()
	{
		if (this.settings.magnetStrength != 1)
		{
			this.getHelperTargetY._draggeeOffsetY = this.$draggee.offset().top;
			return this.getHelperTargetY._draggeeOffsetY + ((this.mouseY - this.mouseOffsetY - this.getHelperTargetY._draggeeOffsetY) / this.settings.magnetStrength);
		}
		else
		{
			return this.base();
		}
	},

	/**
	 * Returns whether the draggee can be inserted before a given item.
	 */
	canInsertBefore: function($item)
	{
		return true;
	},

	/**
	 * Returns whether the draggee can be inserted after a given item.
	 */
	canInsertAfter: function($item)
	{
		return true;
	},

	// Events
	// -------------------------------------------------------------------------

	/**
	 * On Drag Start
	 */
	onDragStart: function()
	{
		this.oldDraggeeIndex = this._getDraggeeIndex();

		// Is the target item not the first item in the draggee?
		if (
			this.$draggee.length > 1 &&
			this._getItemIndex(this.$draggee[0]) > this._getItemIndex(this.$draggee[1])
		)
		{
			// Reposition the target item before the other draggee items in the DOM
			this.$draggee.first().insertBefore(this.$draggee[1]);
		}

		// Create the insertion
		this.$insertion = this.createInsertion();
		this._placeInsertionWithDraggee();

		this.closestItem = null;
		this._clearMidpoints();

		//  Get the closest container that has a height
		if (this.settings.container)
		{
			this.$heightedContainer = $(this.settings.container);

			while (!this.$heightedContainer.height())
			{
				this.$heightedContainer = this.$heightedContainer.parent();
			}
		}

		this.base();
	},

	/**
	 * On Drag
	 */
	onDrag: function()
	{
		// If there's a container set, make sure that we're hovering over it
		if (this.$heightedContainer && !Garnish.hitTest(this.mouseX, this.mouseY, this.$heightedContainer))
		{
			if (this.closestItem)
			{
				this.closestItem = null;
				this._removeInsertion();
			}
		}
		else
		{
			// Is there a new closest item?
			if (
				this.closestItem !== (this.closestItem = this._getClosestItem()) &&
				this.closestItem !== null
			)
			{
				this._updateInsertion();
			}
		}

		this.base();
	},

	/**
	 * On Drag Stop
	 */
	onDragStop: function()
	{
		this._removeInsertion();

		// Return the helpers to the draggees
		this.returnHelpersToDraggees();

		this.base();

		// Has the item actually moved?
		this.$items = $().add(this.$items);
		this.newDraggeeIndex = this._getDraggeeIndex();

		if (this.newDraggeeIndex != this.oldDraggeeIndex)
		{
			this.onSortChange();
		}
	},

	/**
	 * On Insertion Point Change event
	 */
	onInsertionPointChange: function()
	{
		Garnish.requestAnimationFrame($.proxy(function()
		{
			this.trigger('insertionPointChange');
			this.settings.onInsertionPointChange();
		}, this));
	},

	/**
	 * On Sort Change event
	 */
	onSortChange: function()
	{
		Garnish.requestAnimationFrame($.proxy(function()
		{
			this.trigger('sortChange');
			this.settings.onSortChange();
		}, this));
	},

	// Private methods
	// =========================================================================

	_getItemIndex: function(item)
	{
		return $.inArray(item, this.$items);
	},

	_getDraggeeIndex: function()
	{
		return this._getItemIndex(this.$draggee[0]);
	},

	/**
	 * Returns the closest item to the cursor.
	 */
	_getClosestItem: function()
	{
		this._getClosestItem._closestItem = null;

		// Start by checking the draggee/insertion, if either are visible
		// ---------------------------------------------------------------------

		if (!this.settings.removeDraggee)
		{
			this._testForClosestItem(this.$draggee[0]);
		}
		else if (this.insertionVisible)
		{
			this._testForClosestItem(this.$insertion[0]);
		}

		// Check items before the draggee
		// ---------------------------------------------------------------------

		if (this._getClosestItem._closestItem) this._getClosestItem._midpoint = this._getItemMidpoint(this._getClosestItem._closestItem)
		if (this.settings.axis != Garnish.Y_AXIS) this._getClosestItem._startXDist = this._getClosestItem._lastXDist = this._getClosestItem._closestItem ? Math.abs(this._getClosestItem._midpoint.x - this.draggeeVirtualMidpointX) : null;
		if (this.settings.axis != Garnish.X_AXIS) this._getClosestItem._startYDist = this._getClosestItem._lastYDist = this._getClosestItem._closestItem ? Math.abs(this._getClosestItem._midpoint.y - this.draggeeVirtualMidpointY) : null;

		this._getClosestItem._$otherItem = this.$draggee.first().prev();

		while (this._getClosestItem._$otherItem.length)
		{
			// See if we're just getting further away
			this._getClosestItem._midpoint = this._getItemMidpoint(this._getClosestItem._$otherItem[0]);
			if (this.settings.axis != Garnish.Y_AXIS) this._getClosestItem._xDist = Math.abs(this._getClosestItem._midpoint.x - this.draggeeVirtualMidpointX);
			if (this.settings.axis != Garnish.X_AXIS) this._getClosestItem._yDist = Math.abs(this._getClosestItem._midpoint.y - this.draggeeVirtualMidpointY);

			if (
				(this.settings.axis == Garnish.Y_AXIS || (this._getClosestItem._lastXDist !== null && this._getClosestItem._xDist > this._getClosestItem._lastXDist)) &&
				(this.settings.axis == Garnish.X_AXIS || (this._getClosestItem._lastYDist !== null && this._getClosestItem._yDist > this._getClosestItem._lastYDist))
			)
			{
				break;
			}

			if (this.settings.axis != Garnish.Y_AXIS) this._getClosestItem._lastXDist = this._getClosestItem._xDist;
			if (this.settings.axis != Garnish.X_AXIS) this._getClosestItem._lastYDist = this._getClosestItem._yDist;

			// Give the extending class a chance to allow/disallow this item
			if (this.canInsertBefore(this._getClosestItem._$otherItem))
			{
				this._testForClosestItem(this._getClosestItem._$otherItem[0]);
			}

			// Prep the next item
			this._getClosestItem._$otherItem = this._getClosestItem._$otherItem.prev();
		}

		// Check items after the draggee
		// ---------------------------------------------------------------------

		if (this.settings.axis != Garnish.Y_AXIS) this._getClosestItem._lastXDist = this._getClosestItem._startXDist;
		if (this.settings.axis != Garnish.X_AXIS) this._getClosestItem._lastYDist = this._getClosestItem._startYDist;

		this._getClosestItem._$otherItem = this.$draggee.last().next();

		while (this._getClosestItem._$otherItem.length)
		{
			// See if we're just getting further away
			this._getClosestItem._midpoint = this._getItemMidpoint(this._getClosestItem._$otherItem[0]);
			if (this.settings.axis != Garnish.Y_AXIS) this._getClosestItem._xDist = Math.abs(this._getClosestItem._midpoint.x - this.draggeeVirtualMidpointX);
			if (this.settings.axis != Garnish.X_AXIS) this._getClosestItem._yDist = Math.abs(this._getClosestItem._midpoint.y - this.draggeeVirtualMidpointY);

			if (
				(this.settings.axis == Garnish.Y_AXIS || (this._getClosestItem._lastXDist !== null && this._getClosestItem._xDist > this._getClosestItem._lastXDist)) &&
				(this.settings.axis == Garnish.X_AXIS || (this._getClosestItem._lastYDist !== null && this._getClosestItem._yDist > this._getClosestItem._lastYDist))
			)
			{
				break;
			}

			if (this.settings.axis != Garnish.Y_AXIS) this._getClosestItem._lastXDist = this._getClosestItem._xDist;
			if (this.settings.axis != Garnish.X_AXIS) this._getClosestItem._lastYDist = this._getClosestItem._yDist;

			// Give the extending class a chance to allow/disallow this item
			if (this.canInsertAfter(this._getClosestItem._$otherItem))
			{
				this._testForClosestItem(this._getClosestItem._$otherItem[0]);
			}

			// Prep the next item
			this._getClosestItem._$otherItem = this._getClosestItem._$otherItem.next();
		}

		// Return the result
		// ---------------------------------------------------------------------

		// Ignore if it's the draggee or insertion
		if (
			this._getClosestItem._closestItem != this.$draggee[0] &&
			(!this.insertionVisible || this._getClosestItem._closestItem != this.$insertion[0])
		)
		{
			return this._getClosestItem._closestItem;
		}
		else
		{
			return null;
		}
	},

	_clearMidpoints: function()
	{
		this._midpointVersion++;
		this._$prevItem = null;
	},

	_getItemMidpoint: function(item)
	{
		if ($.data(item, 'midpointVersion') != this._midpointVersion)
		{
			// If this isn't the draggee, temporarily move the draggee to this item
			this._getItemMidpoint._repositionDraggee = (
				!this.settings.axis &&
				(!this.settings.removeDraggee || this.insertionVisible) &&
				item != this.$draggee[0] &&
				(!this.$insertion || item != this.$insertion.get(0))
			);

			if (this._getItemMidpoint._repositionDraggee)
			{
				// Is this the first time we've had to temporarily reposition the draggee since the last midpoint clearing?
				if (!this._$prevItem)
				{
					this._$prevItem = (this.insertionVisible ? this.$insertion : this.$draggee).first().prev();
				}

				this._moveDraggeeToItem(item);

				// Now figure out which element we're actually getting the midpoint of
				if (!this.settings.removeDraggee)
				{
					this._getItemMidpoint._$item = this.$draggee;
				}
				else
				{
					this._getItemMidpoint._$item = this.$insertion;
				}
			}
			else
			{
				// We're actually getting the midpoint of this item
				this._getItemMidpoint._$item = $(item);
			}

			this._getItemMidpoint._offset = this._getItemMidpoint._$item.offset();

			$.data(item, 'midpoint', {
				x: this._getItemMidpoint._offset.left + this._getItemMidpoint._$item.outerWidth() / 2,
				y: this._getItemMidpoint._offset.top + this._getItemMidpoint._$item.outerHeight() / 2
			});

			$.data(item, 'midpointVersion', this._midpointVersion);

			delete this._getItemMidpoint._$item;
			delete this._getItemMidpoint._offset;

			if (this._getItemMidpoint._repositionDraggee)
			{
				// Move the draggee back
				if (this._$prevItem.length)
				{
					this.$draggee.insertAfter(this._$prevItem);
				}
				else
				{
					this.$draggee.prependTo(this.$draggee.parent());
				}

				this._placeInsertionWithDraggee();
			}
		}

		return $.data(item, 'midpoint');
	},

	_testForClosestItem: function(item)
	{
		this._testForClosestItem._midpoint = this._getItemMidpoint(item);

		this._testForClosestItem._mouseDist = Garnish.getDist(
			this._testForClosestItem._midpoint.x,
			this._testForClosestItem._midpoint.y,
			this.draggeeVirtualMidpointX,
			this.draggeeVirtualMidpointY
		);

		if (
			this._getClosestItem._closestItem === null ||
			this._testForClosestItem._mouseDist < this._getClosestItem._closestItemMouseDist
		)
		{
			this._getClosestItem._closestItem          = item;
			this._getClosestItem._closestItemMouseDist = this._testForClosestItem._mouseDist;
		}
	},

	/**
	 * Updates the position of the insertion point.
	 */
	_updateInsertion: function()
	{
		if (this.closestItem)
		{
			this._moveDraggeeToItem(this.closestItem);
		}

		// Now that things have shifted around, invalidate the midpoints
		this._clearMidpoints();

		this.onInsertionPointChange();
	},

	_moveDraggeeToItem: function(item)
	{
		// Going down?
		if (this.$draggee.index() < $(item).index())
		{
			this.$draggee.insertAfter(item);
		}
		else
		{
			this.$draggee.insertBefore(item);
		}

		this._placeInsertionWithDraggee();
	},

	_placeInsertionWithDraggee: function()
	{
		if (this.$insertion)
		{
			this.$insertion.insertBefore(this.$draggee.first());
			this.insertionVisible = true;
		}
	},

	/**
	 * Removes the insertion, if it's visible.
	 */
	_removeInsertion: function()
	{
		if (this.insertionVisible)
		{
			this.$insertion.remove();
			this.insertionVisible = false;
		}
	}
},

// Static Properties
// =============================================================================

{
	defaults: {
		container: null,
		insertion: null,
		magnetStrength: 1,
		onInsertionPointChange: $.noop,
		onSortChange: $.noop
	}
});
