/**
 * Menu
 */
Garnish.Menu = Garnish.Base.extend({

	settings: null,

	$container: null,
	$options: null,
	$anchor: null,

	_windowWidth: null,
	_windowHeight: null,
	_windowScrollLeft: null,
	_windowScrollTop: null,

	_anchorOffset: null,
	_anchorWidth: null,
	_anchorHeight: null,
	_anchorOffsetRight: null,
	_anchorOffsetBottom: null,

	_menuWidth: null,
	_menuHeight: null,

	/**
	 * Constructor
	 */
	init: function(container, settings)
	{
		this.setSettings(settings, Garnish.Menu.defaults);

		this.$container = $(container);
		this.$options = $();
		this.addOptions(this.$container.find('a'));

		// Deprecated
		if (this.settings.attachToElement)
		{
			this.settings.anchor = this.settings.attachToElement;
			Garnish.log('The \'attachToElement\' setting is deprecated. Use \'anchor\' instead.');
		}

		if (this.settings.anchor)
		{
			this.$anchor = $(this.settings.anchor);
		}

		// Prevent clicking on the container from hiding the menu
		this.addListener(this.$container, 'mousedown', function(ev)
		{
			ev.stopPropagation();
		});
	},

	addOptions: function($options)
	{
		this.$options = this.$options.add($options);
		$options.data('menu', this);
		this.addListener($options, 'click', 'selectOption');
	},

	setPositionRelativeToAnchor: function()
	{
		this._windowWidth = Garnish.$win.width();
		this._windowHeight = Garnish.$win.height();
		this._windowScrollLeft = Garnish.$win.scrollLeft();
		this._windowScrollTop = Garnish.$win.scrollTop();

		this._anchorOffset = this.$anchor.offset();
		this._anchorWidth = this.$anchor.outerWidth();
		this._anchorHeight = this.$anchor.outerHeight();
		this._anchorOffsetRight = this._anchorOffset.left + this._anchorHeight;
		this._anchorOffsetBottom = this._anchorOffset.top + this._anchorHeight;

		this.$container.css('minWidth', 0);
		this.$container.css('minWidth', this._anchorWidth - (this.$container.outerWidth() - this.$container.width()));

		this._menuWidth = this.$container.outerWidth();
		this._menuHeight = this.$container.outerHeight();

		// Is there room for the menu below the anchor?
		var topClearance = this._anchorOffset.top - this._windowScrollTop,
			bottomClearance = this._windowHeight + this._windowScrollTop - this._anchorOffsetBottom;

		if (bottomClearance >= this._menuHeight || bottomClearance >= topClearance || topClearance < this._menuHeight)
		{
			this.$container.css('top', this._anchorOffsetBottom);
		}
		else
		{
			this.$container.css('top', this._anchorOffset.top - this._menuHeight);
		}

		// Figure out how we're aliging it
		var align = this.$container.data('align');

		if (align != 'left' && align != 'center' && align != 'right')
		{
			align = 'left';
		}

		if (align == 'center')
		{
			this._alignCenter();
		}
		else
		{
			// Figure out which options are actually possible
			var rightClearance = this._windowWidth + this._windowScrollLeft - (this._anchorOffset.left + this._menuWidth),
				leftClearance = this._anchorOffsetRight - this._menuWidth;

			if (align == 'right' && leftClearance >= 0 || rightClearance < 0)
			{
				this._alignRight();
			}
			else
			{
				this._alignLeft();
			}
		}

		delete this._windowWidth;
		delete this._windowHeight;
		delete this._windowScrollLeft;
		delete this._windowScrollTop;
		delete this._anchorOffset;
		delete this._anchorWidth;
		delete this._anchorHeight;
		delete this._anchorOffsetRight;
		delete this._anchorOffsetBottom;
		delete this._menuWidth;
		delete this._menuHeight;
	},

	show: function()
	{
		// Move the menu to the end of the DOM
		this.$container.appendTo(Garnish.$bod)

		if (this.$anchor)
		{
			this.setPositionRelativeToAnchor();
		}

		this.$container.velocity('stop');
		this.$container.css({
			opacity: 1,
			display: 'block'
		});

		Garnish.escManager.register(this, 'hide');
	},

	hide: function()
	{
		this.$container.velocity('fadeOut', { duration: Garnish.FX_DURATION }, $.proxy(function()
		{
			this.$container.detach();
		}, this));

		Garnish.escManager.unregister(this);

		this.trigger('hide');
	},

	selectOption: function(ev)
	{
		this.settings.onOptionSelect(ev.currentTarget);
		this.trigger('optionselect', { selectedOption: ev.currentTarget });
		this.hide();
	},

	_alignLeft: function()
	{
		this.$container.css({
			left: this._anchorOffset.left,
			right: 'auto'
		});
	},

	_alignRight: function()
	{
		this.$container.css({
			right: this._windowWidth - (this._anchorOffset.left + this._anchorWidth),
			left: 'auto'
		});
	},

	_alignCenter: function()
	{
		var left = Math.round((this._anchorOffset.left + this._anchorWidth / 2) - (this._menuWidth / 2));

		if (left < 0)
		{
			left = 0;
		}

		this.$container.css('left', left);
	}

},
{
	defaults: {
		anchor: null,
		onOptionSelect: $.noop
	}
});
