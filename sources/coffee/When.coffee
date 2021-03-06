# When

# * Allow you to add media queries to a view

###
Example:

viewB = new Text
	text: 'lol'
	fontSize: 64
	color: 'black'
	parent: viewA

Below Phone, [
	view: viewA
	properties:
		width: 40
		bc: 'blue'
,
	view: viewB
	properties:
		fontSize: 12
		color: 'red'
]


Below Mobile, viewA,
	width: 100
	bc: 'purple'

Below Mobile, viewB,
	fontSize: 40

Above Mobile, viewB,
	backgroundColor: 'green'

###

# Small
Watch = 'Watch'
Mobile = 'Mobile'
Phone = 'Phone'
Tablet = 'Tablet'
Netbook = 'Netbook'

# Big
Desktop = 'Desktop'
TV = 'TV'
QHD = 'QHD'
UHD = 'UHD'

# Devices
iPad = 'iPad'
iPhone5 = 'iPhone5'
iPhone7 = 'iPhone7'

When = (direction, def, actions) ->

	direction = Utils.capitalizeFirst(direction)
	responsives = {}

	# Allow single line instruction
	if arguments[3] and Utils.isObject(arguments[3])
		actions =
			view: arguments[2]
			properties: arguments[3]

	# Converse object to array if necessary
	actions = [actions] if Utils.isObject(actions) and not Utils.isArray(actions) 
		
	# Loop though actions
	for action in actions

		# if valid object
		if action.view and action.properties
				
			# If the original values object is not yet create, create it
			# Store the original value of the view
			if not action.view._originalValues
				action.view._originalValues = {}
				keys = Object.keys(action.properties)

				# Loop through the properties
				for key in keys
					if key of action.view
						action.view._originalValues[key] = action.view[key]
				
			else
				arr = []
				keys = Object.keys(action.properties)
				
				# Loop through the properties
				for key in keys
					arr[key] = action.view[key] if key of action.view
						
				action.view._originalValues = Utils.defaults action.view._originalValues, arr

			# If def in view does not exist

			if not action.view['_' + direction + def]
				action.view['_' + direction + def] = {}
			
			# Add properties to def in view
			action.view['_' + direction + def] = Utils.extend action.view['_' + direction + def], action.properties

			# Add/update the view in the responsive object
			App._responsives[action.view.id] = action.view
			responsives[action.view.id] = action.view

	App._updateResponsives responsives


# ALIAS
App.when = When

# Is current width below definition?
Below = (def, actions, optional) ->
	When 'below', def, actions, optional

# Is current width above definition?
Above = (def, actions, optional) ->
	When 'above', def, actions, optional

Screen =
	definitions:
		Watch: 0
		iPhone5: 320
		Mobile: 320
		iPhone7: 375
		Phone: 480
		Tablet: 760
		iPad: 768
		Netbook: 960
		Desktop: 1200
		TV: 1600
		QHD: 1980
		UHD: 2600
		
	below : [UHD, QHD, TV, Desktop, Netbook, iPad, Tablet, Phone, iPhone7, Mobile, iPhone5, Watch]
	above : [Watch, iPhone5, Mobile, iPhone7, Phone, Tablet, iPad, Netbook, Desktop, TV, QHD, UHD]

App._updateResponsivesStates = ->
	
	# 1: reset the states
	Below.states = 
		Watch: no
		iPhone5: no
		Mobile: no
		iPhone7: no
		Phone: no
		Tablet: no
		iPad: no
		Netbook: no
		UHD: no
		QHD: no
		TV: no
		Desktop: no

	Above.states = 
		Watch: no
		iPhone5: no
		Mobile: no
		Phone: no
		Tablet: no
		iPad: no
		Netbook: no
		UHD: no
		QHD: no
		TV: no
		Desktop: no

	# 2: update the states
	for definition of Screen.definitions
		w = App.width
		w = App.device.content.width if App.device and App.device.content
		
		if w >= Screen.definitions[definition]
			Above.states[definition] = yes
		if w <= Screen.definitions[definition]
			Below.states[definition] = yes

	# 3: Stop if no page is set
	return if not App.page

	# 4: Update the responsives
	App._updateResponsives App._responsives

	return

App._updateResponsives = (responsives) ->

	# Loop through the responsive views on the current Page
	for viewID of responsives
		
		view = responsives[viewID]
		props = {}

		for def in Screen.below
			#def = Utils.capitalizeFirst(definition)
			#console.log view['_Below' + def]
			if view['_Below' + def] and Below.states[def] is yes
				props = Utils.extend props, view['_Below' + def]

		for def in Screen.above
			#def = Utils.capitalizeFirst(definition)
			if view['_Above' + def] and Above.states[def] is yes
				props = Utils.extend props, view['_Above' + def]

		view.props = view._originalValues
		view.props = props

	return

