/**
 * Context Menu
 */
Garnish.ContextMenu = Garnish.Base.extend({

	$target: null,
	options: null,
	$menu: null,
	showingMenu: false,

	/**
	 * Constructor
	 */
	init: function(target, options, settings)
	{
		this.$target = $(target);

		// Is this already a context menu target?
		if (this.$target.data('contextmenu'))
		{
			Garnish.log('Double-instantiating a context menu on an element');
			this.$target.data('contextmenu').destroy();
		}

		this.$target.data('contextmenu', this);

		this.options = options;
		this.setSettings(settings, Garnish.ContextMenu.defaults);

		Garnish.ContextMenu.counter++;

		this.enable();
	},

	/**
	 * Build Menu
	 */
	buildMenu: function()
	{
		this.$menu = $('<div class="'+this.settings.menuClass+'" style="display: none" />');

		var $ul = $('<ul/>').appendTo(this.$menu);

		for (var i in this.options)
		{
			var option = this.options[i];

			if (option == '-')
			{
				// Create a new <ul>
				$ul = $('<ul/>').appendTo(this.$menu);
			}
			else
			{
				var $li = $('<li></li>').appendTo($ul),
					$a = $('<a>'+option.label+'</a>').appendTo($li);

				if (typeof option.onClick == 'function')
				{
					// maintain the current $a and options.onClick variables
					(function($a, onClick)
					{
						setTimeout($.proxy(function(){
							$a.mousedown($.proxy(function(ev)
							{
								this.hideMenu();
								// call the onClick callback, with the scope set to the item,
								// and pass it the event with currentTarget set to the item as well
								onClick.call(this.currentTarget, $.extend(ev, { currentTarget: this.currentTarget }));
							}, this));
						}, this), 1);
					}).call(this, $a, option.onClick);
				}
			}
		}
	},

	/**
	 * Show Menu
	 */
	showMenu: function(ev)
	{
		// Ignore left mouse clicks
		if (ev.type == 'mousedown' && ev.which != Garnish.SECONDARY_CLICK)
		{
			return;
		}

		if (ev.type == 'contextmenu')
		{
			// Prevent the real context menu from showing
			ev.preventDefault();
		}

		// Ignore if already showing
		if (this.showing && ev.currentTarget == this.currentTarget)
		{
			return;
		}

		this.currentTarget = ev.currentTarget;

		if (! this.$menu)
		{
			this.buildMenu();
		}

		this.$menu.appendTo(document.body);
		this.$menu.show();
		this.$menu.css({ left: ev.pageX+1, top: ev.pageY-4 });

		this.showing = true;

		setTimeout($.proxy(function()
		{
			this.addListener(Garnish.$doc, 'mousedown', 'hideMenu');
		}, this), 0);
	},

	/**
	 * Hide Menu
	 */
	hideMenu: function()
	{
		this.removeListener(Garnish.$doc, 'mousedown');
		this.$menu.hide();
		this.showing = false;
	},

	/**
	 * Enable
	 */
	enable: function()
	{
		this.addListener(this.$target, 'contextmenu,mousedown', 'showMenu');
	},

	/**
	 * Disable
	 */
	disable: function()
	{
		this.removeListener(this.$target, 'contextmenu,mousedown');
	}

},
{
	defaults: {
		menuClass: 'menu'
	},
	counter: 0
});
