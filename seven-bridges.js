// Constants
var ARBITRARY_GRAPH = 0;
var COMPLETE_GRAPH = 1;
var RING_GRAPH = 2;
var LINE_GRAPH = 3;

// Turn on/off firebug logging
var logging = false;

// ****************************************************
//  ANIMATION
// ****************************************************

/* Message class, represents the message view */
function Message(x,y,message,fill) {
	this.x = x || 0;
	this.y = y || 0;
	this.message = message || "";
	this.fill = fill || '#FF0000';
	
	this.speed = -1; // speed message is travelling
}

Message.prototype.draw = function(ctx) {
	ctx.fillStyle = this.fill;
	ctx.fillRect(this.x, this.y, 7,7);
	
	// Draw msg
	ctx.font = "16pt Century Gothic";
	ctx.fillStyle = '#000000'
	ctx.fillText(""+this.message, this.x+8, this.y);
}

/* State class, each node has a state */
function State(name, color) {
	this.color = color;
	this.name = name;
}

/* Animator class, manages the animation of the algorithms */
function Animator(graph, speedSliderVal) {
	this.graph = graph;
	this.animating = false;
	this.speedModifier = speedSliderVal || 5;
}

Animator.prototype.reset = function() {
	this.animating = false;
}

Animator.prototype.setSpeedModifier = function(speedVal) {
	this.speedModifier = speedVal;
}

Animator.prototype.stopAnimation = function() {
	this.animating = false;
	if (graph != null) {
		this.graph.messages = [];
		//this.graph.setAllNodeStates(new State("default",'#AAAAAA'));
		this.graph.reset();
	}
}

/* Call to send message between nodes */
Animator.prototype.sendMessage = function(msg, destNode, edge) {
	var baseSpeed;
	
	// Check if FIFO, if so, set the speed to the same as the current messages travelling
	if (graph.isFIFO && edge.messages.length > 0) {
		baseSpeed = edge.messages[0].speed;
	} else {
		baseSpeed = Math.floor(Math.random()*10) + 1;
	}
	
	// Set message's current speed (without speedModifier)
	msg.speed = baseSpeed;
	
	// Add to edge's and graph's messages
	graph.messages.push(msg);
	edge.messages.push(msg);
	
	if (this.animating) {
		this.sendMessageLoop(msg, destNode, edge, baseSpeed);
	}
}

/* NOT AN API CALL. Called by sendMessage to execute the animation*/
Animator.prototype.sendMessageLoop = function(msg, destNode, edge, baseSpeed) {
	// Figure out where to move
	var slope = (msg.y - destNode.y)/(msg.x - destNode.x);
	var angle = Math.atan(slope);
	var distX = Math.abs(Math.cos(angle)*baseSpeed*this.speedModifier);
	var distY = Math.abs(Math.sin(angle)*baseSpeed*this.speedModifier);
	
	// Move shape
	var oldX = msg.x;
	var oldY = msg.y;
	if (msg.x > destNode.x) msg.x -= distX;
	else msg.x += distX;
	if (msg.y > destNode.y) msg.y -= distY;
	else msg.y += distY;
	
	graph.valid = false; 
	
	// Check if message has arrived at the node
  	if (Math.abs(msg.x - destNode.x) < 10 && Math.abs(msg.y - destNode.y) < 10
		|| (((msg.x > oldX && destNode.x < msg.x && destNode.x > oldX) || (msg.x < oldX && destNode.x > msg.x && destNode.x < oldX)) 
			|| ((msg.y > oldY && destNode.y < msg.y && destNode.y > oldY) || (msg.y < oldY && destNode.y > msg.y && destNode.y < oldY)))
		) 
	{
		// Remove the message from the graph array
		var index = graph.messages.indexOf(msg);
		if (index >= 0) graph.messages.splice(index,1);
		
		// Remove the message from the edge array
		var index = edge.messages.indexOf(msg);
		if (index >= 0) edge.messages.splice(index,1);
		
		// Handle the message at the node
		setTimeout(function(){destNode.handleMessage(msg);},0);
		
	} else if (this.animating) {
		// Call back this method in 30 miliseconds
		var animator = this; // save this to use in closure
		setTimeout(function(){animator.sendMessageLoop(msg, destNode, edge, baseSpeed);},30);
	}	
}


// ******************
//    ALGORITHMS
// ******************
Animator.prototype.broadcast = function() {
	var animator = this;
	this.animating = true;
	//this.graph.animating = true;
	var SLEEPING = new State("sleeping","#AAAAAA");
	var WAITING = new State("waiting","#FFFFFF");
	var DONE = new State("done","#51BBE3");
	this.graph.setAllNodeStates(SLEEPING);
	
	// Wakeup nodes
	for (var i = 0; i < this.graph.nodes.length; i++) {
		var node = this.graph.nodes[i];
		var sleepTime = Math.floor(Math.random()*3) * (Math.floor(Math.random()*500)+500);		
		var fnc = function(aNode){ return function(){aNode.handleMessage(new Message(0,0,'wakeup',0));}}(node)
		setTimeout(fnc, sleepTime);
	}
	
	Node.prototype.handleMessage = function(message) {
		if (!animator.animating) {return};
		
		// State 'waiting'
		if (this.state == WAITING) 
		{
		 	// Message 'wakeup'
			if (message.message == "flood") 
			{
				this.setState(DONE);
			}
		} 
		else if (this.state == SLEEPING) // State 'sleeping'
		{
			// Message 'wakeup'
			if (message.message == 'wakeup')
			{
				for (var j = 0; j < this.adjNodes.length; j++) {
					var adjNode = this.adjNodes[j];
					var msg = new Message(this.x, this.y, 'flood','#DF375F');
					animator.sendMessage(msg, adjNode, this.edgeForAdjacentNode(adjNode));
				}	
				this.setState(WAITING);
			}
			else if (message.message == 'flood')
			{
				for (var j = 0; j < this.adjNodes.length; j++) {
					var adjNode = this.adjNodes[j];
					var msg = new Message(this.x, this.y, 'flood','#DF375F');
					animator.sendMessage(msg, adjNode, this.edgeForAdjacentNode(adjNode));
				}
				this.setState(DONE);
			}
		}
	}  
}

Animator.prototype.completeElect = function() {
	if (logging) console.log("STARTING COMPLETE_ELECT");
	var animator = this;
	this.animating = true;
	
	// Colors
	const CAPTURED_LINK_COLOR = '#000000';
	const DEFAULT_LINK_COLOR = '#888888'
	const MESSAGE_COLOR = '#C93153';
	const CAPTURED_NODE_COLOR = '#AEE0F3';
	const PASSIVE_NODE_COLOR = '#AAAAAA';
	const SLEEPING_NODE_COLOR = '#FFFFFF';
	const CANDIDATE_NODE_COLOR = '#F2E7C1';
	const LEADER_NODE_COLOR = '#E3DBB9';
	const FOLLOWER_NODE_COLOR = '#5A9BBF';
	
	// Node states
	var SLEEPING = new State("sleeping",SLEEPING_NODE_COLOR)
	var CANDIDATE = new State("candidate",CANDIDATE_NODE_COLOR);
	var PASSIVE = new State("passvive",PASSIVE_NODE_COLOR);
	var CAPTURED = new State("captured",CAPTURED_NODE_COLOR);
	
	var LEADER = new State("leader",LEADER_NODE_COLOR);
	var FOLLOWER = new State("follower",FOLLOWER_NODE_COLOR);
	
	this.graph.setAllNodeStates(SLEEPING);
	this.graph.setAllEdgesColorAndWidth(DEFAULT_LINK_COLOR,1);
	
	// Wakeup nodes
	for (var i = 0; i < this.graph.nodes.length; i++) {
		var node = this.graph.nodes[i];
		var sleepTime = Math.floor(Math.random()*3) * (Math.floor(Math.random()*500)+500);		
		var fnc = function(aNode){ return function(){aNode.handleMessage(new Message(0,0,'wakeup',0));}}(node)
		setTimeout(fnc, sleepTime);
	}
	
	Node.prototype.handleMessage = function(message) 
	{
		if (!animator.animating) {return};
		if (logging && message.message != "wakeup") console.log("Node " + this.id + " (" + this.state.name + ") received: "+ message.message+" from Node "+message.sender.id);
		if (logging && message.message == "wakeup") console.log("Node " + this.id + " (" + this.state.name + ") received: "+ message.message+" spontaneusly");
		
		if (this.state == SLEEPING) // State SLEEPING
		{
			if (message.message == 'wakeup') // Message 'wakeup'
			{
				this.stage = 1;
				this.nextNeighbour = 1; // index of 1, we'll send to 0 right now
				
				var msg = new Message(this.x, this.y, 'capture',MESSAGE_COLOR);
				msg.stage = this.stage;
				msg.val = this.id;
				msg.sender = this;
				animator.sendMessage(msg, this.adjNodes[0], this.adjEdges[0]);

				this.setState(CANDIDATE);
				if (logging) console.log("Node " + this.id + " (" + this.state.name + ", "+this.stage+") sent "+msg.message+" message to : Node "+ this.adjNodes[0].id);
				
			}
			else if (message.message == 'capture') // Message 'capture'
			{	
				// set link colors
				for (var i = 0; i < this.adjNodes.length; i++) {
					if (this.adjEdges[i])
						this.adjEdges[i].setColorAndWidth(DEFAULT_LINK_COLOR,1);
				}
				this.edgeForAdjacentNode(message.sender).setColorAndWidth(CAPTURED_LINK_COLOR,2);
				
				this.stage = 1;
				this.owner = message.sender;
				this.ownerstage = message.stage+1;
				
				var msg = new Message(this.x, this.y, 'accept',MESSAGE_COLOR);
				msg.stage = message.stage;
				msg.val = message.val;
				msg.sender = this;
				animator.sendMessage(msg, message.sender, this.edgeForAdjacentNode(message.sender));
				
				this.setState(CAPTURED);
				if (logging) console.log("Node " + this.id + " (" + this.state.name + ", "+this.stage+") sent "+msg.message+" message to : Node "+ message.sender.id);
								
			}
			else if (message.message == 'terminate') // Message 'terminate'
			{
				this.setState(FOLLOWER);
				
				// set link colors
				for (var i = 0; i < this.adjNodes.length; i++) {
					if (this.adjEdges[i])
						this.adjEdges[i].setColorAndWidth(DEFAULT_LINK_COLOR,1);
				}
			    this.edgeForAdjacentNode(message.sender).setColorAndWidth(CAPTURED_LINK_COLOR,2);
				if (logging) console.log("Node " + this.id + " (" + this.state.name + ", "+this.stage+")");
			}
		}
		else if (this.state == CANDIDATE) // State CANDIDATE
		{
			if (message.message == 'capture') // Message 'capture'
			{
				if    ((message.stage < this.stage) 
				   || ((message.stage == this.stage) && (message.val > this.id)))
				{
					var msg = new Message(this.x, this.y, 'reject',MESSAGE_COLOR);
					msg.stage = this.stage;
					msg.sender = this;
					animator.sendMessage(msg, message.sender, this.edgeForAdjacentNode(message.sender));
					if (logging) console.log("Node " + this.id + " (" + this.state.name + ", "+this.stage+") sent "+msg.message+" message to : Node "+ message.sender.id);
				}
				else
				{
					// set link colors
					for (var i = 0; i < this.adjNodes.length; i++) {
						if (this.adjEdges[i])
							this.adjEdges[i].setColorAndWidth(DEFAULT_LINK_COLOR,1);
					}
					this.edgeForAdjacentNode(message.sender).setColorAndWidth(CAPTURED_LINK_COLOR,2);
					
					this.owner = message.sender;
					this.ownerstage = message.stage+1;
					
					this.setState(CAPTURED);
					
					var msg = new Message(this.x, this.y, 'accept',MESSAGE_COLOR);
					msg.stage = message.stage;
					msg.val = message.val;
					msg.sender = this;
					animator.sendMessage(msg, message.sender, this.edgeForAdjacentNode(message.sender));
					if (logging) console.log("Node " + this.id + " (" + this.state.name + ", "+this.stage+") sent "+msg.message+" message to : Node "+ message.sender.id);	
				}
			}
			else if (message.message == 'accept') // Message 'accept'
			{				
				this.stage++;
				var n = this.adjNodes.length;
				if (this.stage >= 1+(n/2)) {
					for (var i = 0; i < this.adjNodes.length; i++) {
						var msg = new Message(this.x, this.y, 'terminate',MESSAGE_COLOR);
						msg.sender = this;
						animator.sendMessage(msg, this.adjNodes[i], this.edgeForAdjacentNode(this.adjNodes[i]));
						if (logging) console.log("Node " + this.id + " (LEADER, "+this.stage+") sent "+msg.message+" message to : Node "+ this.adjNodes[i].id);
					}
					this.setState(LEADER);
				} else {
					var msg = new Message(this.x, this.y, 'capture',MESSAGE_COLOR);
					msg.stage = this.stage;
					msg.val = this.id;
					msg.sender = this;
					animator.sendMessage(msg, this.adjNodes[this.nextNeighbour], this.adjEdges[this.nextNeighbour]);
					if (logging) console.log("Node " + this.id + " (" + this.state.name + ", "+this.stage+") sent "+msg.message+" message to : Node "+ this.adjNodes[this.nextNeighbour].id);
					this.nextNeighbour++;
				}
			}
			else if (message.message == 'reject') // Message 'reject'
			{
				this.setState(PASSIVE);
				
				// set link colors
				for (var i = 0; i < this.adjNodes.length; i++) {
					if (this.adjEdges[i])
						this.adjEdges[i].setColorAndWidth(DEFAULT_LINK_COLOR,1);
				}
				if (logging) console.log("Node " + this.id + " (" + this.state.name + ", "+this.stage+")");
			}
			else if (message.message == 'terminate') // Message 'terminate'
			{
				this.setState(FOLLOWER);
				
				// set link colors
				for (var i = 0; i < this.adjNodes.length; i++) {
					if (this.adjEdges[i])
						this.adjEdges[i].setColorAndWidth(DEFAULT_LINK_COLOR,1);
				}
				this.edgeForAdjacentNode(message.sender).setColorAndWidth(CAPTURED_LINK_COLOR,2); 
				if (logging) console.log("Node " + this.id + " (" + this.state.name + ", "+this.stage+")");
			}
			else if (message.message == 'warning') // Message 'warning'
			{
				if ((message.stage < this.stage) || ((message.stage == this.stage) && (message.val > this.id))) {
					var msg = new Message(this.x, this.y, 'no',MESSAGE_COLOR);
					msg.stage = this.stage;
					msg.sender = this;
					animator.sendMessage(msg, message.sender, this.edgeForAdjacentNode(message.sender));
					if (logging) console.log("Node " + this.id + " (" + this.state.name + ", "+this.stage+") sent "+msg.message+" message to : Node "+ message.sender.id);
				} else {
					var msg = new Message(this.x, this.y, 'yes',MESSAGE_COLOR);
					msg.stage = message.stage;
					msg.sender = this;
					animator.sendMessage(msg, message.sender, this.edgeForAdjacentNode(message.sender));
						
				    this.setState(PASSIVE);
				
					// set link colors
					for (var i = 0; i < this.adjNodes.length; i++) {
						if (this.adjEdges[i])
							this.adjEdges[i].setColorAndWidth(DEFAULT_LINK_COLOR,1);
					}
					if (logging) console.log("Node " + this.id + " (" + this.state.name + ", "+this.stage+") sent "+msg.message+" message to : Node "+ message.sender.id);
				}
			}
		} 
		else if (this.state == PASSIVE) // State PASSIVE
		{
			if (message.message == 'capture') // Message 'capture'
			{
				if ((message.stage < this.stage) || ((message.stage == this.stage) && (message.val > this.id))) {
					var msg = new Message(this.x, this.y, 'reject',MESSAGE_COLOR);
					msg.stage = this.stage;
					msg.sender = this;
					animator.sendMessage(msg, message.sender, this.edgeForAdjacentNode(message.sender));
					if (logging) console.log("Node " + this.id + " (" + this.state.name + ", "+this.stage+") sent "+msg.message+" message to : Node "+ message.sender.id);
				} else {
					var msg = new Message(this.x, this.y, 'accept',MESSAGE_COLOR);
					msg.stage = message.stage;
					msg.val = message.val;
					msg.sender = this;
					animator.sendMessage(msg, message.sender, this.edgeForAdjacentNode(message.sender));
					
					this.owner = message.sender;
					this.ownerstage = message.stage+1;
					this.setState(CAPTURED);
					
					// set link colors
					for (var i = 0; i < this.adjNodes.length; i++) {
						if (this.adjEdges[i])
							this.adjEdges[i].setColorAndWidth(DEFAULT_LINK_COLOR,1);
					}
					this.edgeForAdjacentNode(message.sender).setColorAndWidth(CAPTURED_LINK_COLOR,2); 
					if (logging) console.log("Node " + this.id + " (" + this.state.name + ", "+this.stage+") sent "+msg.message+" message to : Node "+ message.sender.id);
				}
			}
			else if (message.message == 'warning') // Message 'warning'
			{
				if ((message.stage < this.stage) || ((message.stage == this.stage) && (message.val > this.id))) {
					var msg = new Message(this.x, this.y, 'no',MESSAGE_COLOR);
					msg.stage = this.stage;
					msg.sender = this;
					animator.sendMessage(msg, message.sender, this.edgeForAdjacentNode(message.sender));
					if (logging) console.log("Node " + this.id + " (" + this.state.name + ", "+this.stage+") sent "+msg.message+" message to : Node "+ message.sender.id);
				} else {
					var msg = new Message(this.x, this.y, 'yes',MESSAGE_COLOR);
					msg.stage = message.stage;
					msg.sender = this;
					animator.sendMessage(msg, message.sender, this.edgeForAdjacentNode(message.sender));
					if (logging) console.log("Node " + this.id + " (" + this.state.name + ", "+this.stage+") sent "+msg.message+" message to : Node "+ message.sender.id);
				}
			}
			else if (message.message == 'terminate') // Message 'terminate'
			{
				this.setState(FOLLOWER);
				
				// set links colors
				for (var i = 0; i < this.adjNodes.length; i++) {
					if (this.adjEdges[i])
						this.adjEdges[i].setColorAndWidth(DEFAULT_LINK_COLOR,1);
				}
				this.edgeForAdjacentNode(message.sender).setColorAndWidth(CAPTURED_LINK_COLOR,2); 
				if (logging) console.log("Node " + this.id + " (" + this.state.name + ", "+this.stage+")");
			}
		}
		else if (this.state == CAPTURED) // State 'captured'
		{
			if (message.message == 'capture') // Message 'capture' + 
			{
				if (message.stage < this.ownerstage) {
					var msg = new Message(this.x, this.y, 'reject',MESSAGE_COLOR);
					msg.ownerstage = this.ownerstage;
					msg.sender = this;
					animator.sendMessage(msg, message.sender, this.edgeForAdjacentNode(message.sender));
					if (logging) console.log("Node " + this.id + " (" + this.state.name + ", "+this.stage+") sent "+msg.message+" message to : Node "+ message.sender.id);
				} else { // + CLOSE N(x)-{owner}
					this.attack = message.sender;
					
					var msg = new Message(this.x, this.y, 'warning',MESSAGE_COLOR);
					msg.val = message.val;
					msg.stage = message.stage;
					msg.sender = this;
					animator.sendMessage(msg, this.owner, this.edgeForAdjacentNode(this.owner));
					if (logging) console.log("Node " + this.id + " (" + this.state.name + ", "+this.stage+") sent "+msg.message+" message to : Node "+ this.owner.id + " and saved attacker: Node "+this.attack.id);
				}
			}
			else if (message.message == 'no') // Message 'no' + OPEN N(x)
			{
				var msg = new Message(this.x, this.y, 'reject',MESSAGE_COLOR);
				msg.stage = message.stage;
				msg.sender = this;
				animator.sendMessage(msg, this.attack, this.edgeForAdjacentNode(this.attack));
				if (logging) console.log("Node " + this.id + " (" + this.state.name + ", "+this.stage+") sent "+msg.message+" message to : Node "+ this.attack.id);
			}
			else if (message.message == 'yes') // Message 'yes' + OPEN N(x)
			{				
				this.ownerstage = message.stage+1;
				this.owner = this.attack;
				
				var msg = new Message(this.x, this.y, 'accept',MESSAGE_COLOR);
				msg.stage = message.stage;
				msg.val = message.val;
				msg.sender = this;
				animator.sendMessage(msg, this.attack, this.edgeForAdjacentNode(this.attack));
				
				// set link colors
				for (var i = 0; i < this.adjNodes.length; i++) {
					if (this.adjEdges[i])
						this.adjEdges[i].setColorAndWidth(DEFAULT_LINK_COLOR,1);
				}
				this.edgeForAdjacentNode(this.attack).setColorAndWidth(CAPTURED_LINK_COLOR,2);
				if (logging) console.log("Node " + this.id + " (" + this.state.name + ", "+this.stage+") sent "+msg.message+" message to : Node "+ this.attack.id);
			}
			else if (message.message == 'warning') // Message 'warning'
			{
				if (message.stage < this.ownerstage) {
					var msg = new Message(this.x, this.y, 'no',MESSAGE_COLOR);
					msg.ownerstage = this.ownerstage;
					msg.sender = this;
					animator.sendMessage(msg, message.sender, this.edgeForAdjacentNode(message.sender));
					if (logging) console.log("Node " + this.id + " (" + this.state.name + ", "+this.stage+") sent "+msg.message+" message to : Node "+ message.sender.id);
				} else {
					var msg = new Message(this.x, this.y, 'yes',MESSAGE_COLOR);
					msg.stage = message.stage;
					msg.sender = this;
					animator.sendMessage(msg, message.sender, this.edgeForAdjacentNode(message.sender));
					if (logging) console.log("Node " + this.id + " (" + this.state.name + ", "+this.stage+") sent "+msg.message+" message to : Node "+ message.sender.id);
				}
			}
			else if (message.message == 'terminate') // Message 'terminate'
			{
				this.setState(FOLLOWER);
				
				// set link colors
				for (var i = 0; i < this.adjNodes.length; i++) {
					if (this.adjEdges[i])
						this.adjEdges[i].setColorAndWidth(DEFAULT_LINK_COLOR,1);
				}
			    this.edgeForAdjacentNode(message.sender).setColorAndWidth(CAPTURED_LINK_COLOR,2);
				if (logging) console.log("Node " + this.id + " (" + this.state.name + ", "+this.stage+")");
			}
			else if (message.message == 'accept') // JUST USED FOR UPDATING LINK COLORS
			{
				// set link colors
				for (var i = 0; i < this.adjNodes.length; i++) {
					if (this.adjEdges[i])
						this.adjEdges[i].setColorAndWidth(DEFAULT_LINK_COLOR,1);
				}
			    this.edgeForAdjacentNode(this.owner).setColorAndWidth(CAPTURED_LINK_COLOR,2);
				if (logging) console.log("Node " + this.id + " (" + this.state.name + ", "+this.stage+")");
			}
		}
	}  
}

Animator.prototype.spanningTreeConstruction = function() {
	var animator = this;
	this.animating = true;
	
	// Colors
	const TREE_LINK_COLOR = '#000000';
	const DEFAULT_LINK_COLOR = '#888888'
	const MESSAGE_COLOR = '#C93153';

	const SLEEPING_NODE_COLOR = '#FFFFFF';
	const ACTIVE_NODE_COLOR = '#F2E7C1';
	const INITIATOR_NODE_COLOR = '#6BBCE8';
	const DONE_NODE_COLOR = '#F53D68';
	const ROOT_NODE_COLOR = '#5A9BBF';
	
	
	// Node states
	var SLEEPING = new State("sleeping",SLEEPING_NODE_COLOR)
	var INITIATOR = new State("initiator",INITIATOR_NODE_COLOR);
	var ACTIVE = new State("active",ACTIVE_NODE_COLOR);
	var DONE = new State("done",DONE_NODE_COLOR);
	var ROOT = new State("done",ROOT_NODE_COLOR);
	
	
	this.graph.setAllNodeStates(SLEEPING);
	this.graph.setAllEdgesColorAndWidth(DEFAULT_LINK_COLOR,1);
	
	// Wakeup nodes
	var randomIndex = Math.floor(Math.random()*this.graph.nodes.length);
	var initiatorNode = this.graph.nodes[randomIndex];
	initiatorNode.setState(INITIATOR);
	var fnc = function(initiatorNode){ return function(){initiatorNode.handleMessage(new Message(0,0,'initiate',0));}}(initiatorNode)
	setTimeout(fnc, 500);
	
	if (logging) console.log("STARTING SPANNING TREE CONSTRUCTION, Initiator: " + initiatorNode.id);
	
	
	Node.prototype.handleMessage = function(message) {
		if (!animator.animating) {return};
		if (this.state == INITIATOR) {
			if (message.message == 'initiate') { // Message 'initiate'
				this.root = true;
				this.treeNeighbours = [];
				this.counter = 0;
				this.ackCounter = 0;
				
				for (var j = 0; j < this.adjNodes.length; j++) {
					var adjNode = this.adjNodes[j];
					var msg = new Message(this.x, this.y, 'question','#DF375F');
					msg.sender = this;
					animator.sendMessage(msg, adjNode, this.edgeForAdjacentNode(adjNode));
					if (logging) console.log("Node " + this.id + " (INITIATOR) sent "+msg.message+" message to : Node "+ adjNode.id);
				}	
				
				this.setState(ACTIVE);
			}			
		} else if (this.state == SLEEPING) {
			if (message.message == 'question') { // Message 'initiate'
				if (logging) console.log("Node " + this.id + " (SLEEPING) received "+message.message+" from Node "+ message.sender.id);
				this.root = false;
				this.treeParent = message.sender;
				this.treeNeighbours = [];
				this.treeNeighbours.push(message.sender);
				this.counter = 1;
				this.ackCounter = 0;

				var msg = new Message(this.x, this.y, 'yes','#DF375F');
				msg.sender = this;
				animator.sendMessage(msg, message.sender, this.edgeForAdjacentNode(message.sender));
				if (logging) console.log("Node " + this.id + " (SLEEPING) sent "+msg.message+" message to : Node "+ message.sender.id);
				
				this.edgeForAdjacentNode(message.sender).setColorAndWidth(TREE_LINK_COLOR,2);
				
				if (this.counter == this.adjNodes.length) {
					this.check();
				} else {
					for (var j = 0; j < this.adjNodes.length; j++) {
						var adjNode = this.adjNodes[j];
						if (adjNode != message.sender) {
							var msg = new Message(this.x, this.y, 'question','#DF375F');
							msg.sender = this;
							animator.sendMessage(msg, adjNode, this.edgeForAdjacentNode(adjNode));
							if (logging) console.log("Node " + this.id + " (SLEEPING) sent "+msg.message+" message to : Node "+ adjNode.id);
						}
					}
				}
				this.setState(ACTIVE);
			}			
		} else if (this.state == ACTIVE) {
			if (logging) console.log("Node " + this.id + " (ACTIVE) received "+message.message+" from Node "+ message.sender.id);
			if (message.message == 'question') { // Message 'question'
				this.counter++;
				if (logging) console.log("Counter: "+this.counter+" and AckCounter: "+this.ackCounter+" and Neighbours: "+this.adjNodes.length+" and TreeNeighbours: "+this.treeNeighbours.length);
				
				if (this.counter == this.adjNodes.length) { //&& !this.root) {
					this.check();
				}/* else if (this.counter == this.adjNodes.length) {
					if (this.root) {
						if (this.ackCounter == this.treeNeighbours.length) {
							for (var j = 0; j < this.treeNeighbours.length; j++) {
								var neighbour = this.treeNeighbours[j];
								var msg = new Message(this.x, this.y, 'terminate','#DF375F');
								msg.sender = this;
								animator.sendMessage(msg, neighbour, this.edgeForAdjacentNode(neighbour));
								if (logging) console.log("Node " + this.id + " (ACTIVE) sent "+msg.message+" message to : Node "+ neighbour.id);
							}
							if (this.root == true) 
								this.setState(ROOT);
							else 
								this.setState(DONE);
						}
					}
				}*/
			} else if (message.message == 'yes') { // Message 'yes'
				this.treeNeighbours.push(message.sender);
				this.counter++;
				if (logging) console.log("Counter: "+this.counter+" and AckCounter: "+this.ackCounter+" and Neighbours: "+this.adjNodes.length+" and TreeNeighbours: "+this.treeNeighbours.length);
				
				if (this.counter == this.adjNodes.length && !this.root) {
					this.check();
				}
			} else if (message.message == 'ack') { // Message 'initiate'
				this.ackCounter++;
				if (logging) console.log("Counter: "+this.counter+" and AckCounter: "+this.ackCounter+" and Neighbours: "+this.adjNodes.length+" and TreeNeighbours: "+this.treeNeighbours.length);
				
				if (this.counter == this.adjNodes.length) {
					if (this.root) {
						if (this.ackCounter == this.treeNeighbours.length) {
							for (var j = 0; j < this.treeNeighbours.length; j++) {
								var neighbour = this.treeNeighbours[j];
								var msg = new Message(this.x, this.y, 'terminate','#DF375F');
								msg.sender = this;
								animator.sendMessage(msg, neighbour, this.edgeForAdjacentNode(neighbour));
								if (logging) console.log("Node " + this.id + " (ACTIVE) sent "+msg.message+" message to : Node "+ neighbour.id);
							}
							if (this.root == true) 
								this.setState(ROOT);
							else 
								this.setState(DONE);
						}
					} else if (this.ackCounter == this.treeNeighbours.length-1) {
						var msg = new Message(this.x, this.y, 'ack','#DF375F');
						msg.sender = this;
						animator.sendMessage(msg, this.treeParent, this.edgeForAdjacentNode(this.treeParent));
						if (logging) console.log("Node " + this.id + " (ACTIVE) sent "+msg.message+" message to : Node "+ this.treeParent);
					}
				}
			} else if (message.message == 'terminate') { // Message 'initiate'
				for (var j = 0; j < this.treeNeighbours.length; j++) {
					var neighbour = this.treeNeighbours[j];
					if (neighbour != this.treeParent) {
						var msg = new Message(this.x, this.y, 'terminate','#DF375F');
						msg.sender = this;
						animator.sendMessage(msg, neighbour, this.edgeForAdjacentNode(neighbour));
					}
				}
				if (this.root == true) 
					this.setState(ROOT);
				else 
					this.setState(DONE);
			}
		}
	}
	
	Node.prototype.check = function() {
		if (logging) console.log("Node " + this.id + "("+this.state.name+") checking...");
		if (this.treeNeighbours.length == 1) { // LEAF
			if (logging) console.log("Node " + this.id + " (ACTIVE) passed check: TreeNeighbours="+this.treeNeighbours.length+" and parent: "+this.treeParent.id);
			
			var msg = new Message(this.x, this.y, 'ack','#DF375F');
			msg.sender = this;
			animator.sendMessage(msg, this.treeParent, this.edgeForAdjacentNode(this.treeParent));
			if (logging) console.log("Node " + this.id + "("+this.state.name+") sent "+msg.message+" message to : Node "+ this.treeParent.id);
			
		} else if (this.ackCounter == this.treeNeighbours.length-1 && this.counter == this.adjNodes.length){
			if (logging) console.log("Node " + this.id + " (ACTIVE) passed non-leaf check: TreeNeighbours="+this.treeNeighbours.length+" and parent: "+this.treeParent.id);
			var msg = new Message(this.x, this.y, 'ack','#DF375F');
			msg.sender = this;
			animator.sendMessage(msg, this.treeParent, this.edgeForAdjacentNode(this.treeParent));
			if (logging) console.log("Node " + this.id + "("+this.state.name+") sent "+msg.message+" message to : Node "+ this.treeParent.id);
		} else {
			if (logging) console.log("Node " + this.id + " (ACTIVE) failed check: TreeNeighbours="+this.treeNeighbours.length+" and parent: "+this.treeParent.id);
			
		}
	}
}

Animator.prototype.ringElectAllTheWay = function() { 
	if (logging) console.log("STARTING COMPLETE_ELECT");
	var animator = this;
	this.animating = true;
	
	// Colors
	const MESSAGE_COLOR = '#C93153';
	const SLEEPING_NODE_COLOR = '#FFFFFF';
	const CANDIDATE_NODE_COLOR = '#F2E7C1';
	const LEADER_NODE_COLOR = '#E3DBB9';
	const FOLLOWER_NODE_COLOR = '#5A9BBF';
	
	// Node states
	var SLEEPING = new State("sleeping",SLEEPING_NODE_COLOR)
	var AWAKE = new State("awake",CANDIDATE_NODE_COLOR);
	var LEADER = new State("leader",LEADER_NODE_COLOR);
	var FOLLOWER = new State("follower",FOLLOWER_NODE_COLOR);
	
	this.graph.setAllNodeStates(SLEEPING);
	this.graph.setAllEdgesColorAndWidth('#000000',1);
	
	// Wakeup nodes
	for (var i = 0; i < this.graph.nodes.length; i++) {
		var node = this.graph.nodes[i];
		var sleepTime = Math.floor(Math.random()*3) * (Math.floor(Math.random()*500)+500);		
		var fnc = function(aNode){ return function(){aNode.handleMessage(new Message(0,0,'wakeup',0));}}(node)
		setTimeout(fnc, sleepTime);
	}
	
	Node.prototype.handleMessage = function(message) 
	{
		if (!animator.animating) {return};		
		if (this.state == SLEEPING) // State SLEEPING
		{
			if (message.message == 'wakeup') // Message 'wakeup'
			{
				this.count = 1;
				this.known = false;
				this.min = this.id;
				this.ringsize = 1;
				
				var msg = new Message(this.x, this.y, "elect("+this.id+")",MESSAGE_COLOR);
				msg.count = this.ringsize;
				msg.id = this.id;
				msg.sender = this;
				animator.sendMessage(msg, this.adjNodes[0], this.adjEdges[0]);

				this.setState(AWAKE);				
			} else if (message.message.substring(0,5) == "elect") {
				this.count = 1;
				this.known = false;
				this.min = this.id;
				this.ringsize = 1;
				
				var msg = new Message(this.x, this.y, "elect("+this.id+")",MESSAGE_COLOR);
				msg.count = this.ringsize;
				msg.id = this.id;
				msg.sender = this;
				animator.sendMessage(msg, this.adjNodes[0], this.adjEdges[0]);

				var msg = new Message(this.x, this.y, message.message,MESSAGE_COLOR);
				msg.count = message.count+1;
				msg.id = message.id;
				msg.sender = this;
				var targetNode;
				if (this.adjNodes[0] == message.sender) 
					targetNode = this.adjNodes[1];
				else 
					targetNode = this.adjNodes[0];
				animator.sendMessage(msg, targetNode, this.edgeForAdjacentNode(targetNode));
				
				if (this.min > message.id) 
					this.min = message.id;
				this.count++;
				
				this.setState(AWAKE);				
			}
		} else if (this.state == AWAKE) { // State SLEEPING
			if (message.message.substring(0,5) == "elect") {
				if (message.id != this.id) {
					var msg = new Message(this.x, this.y, message.message,MESSAGE_COLOR);
					msg.count = message.count+1;
					msg.id = message.id;
					msg.sender = this;
					
					var targetNode;
					if (this.adjNodes[0] == message.sender) 
						targetNode = this.adjNodes[1];
					else 
						targetNode = this.adjNodes[0];
					animator.sendMessage(msg, targetNode, this.edgeForAdjacentNode(targetNode));

					if (this.min > message.id) 
						this.min = message.id;
					this.count++;
					if (this.known == true) 
						this.check();
				} else {
					this.ringsize = message.count;
					this.known = true;
					this.check();
				}
			}
		}
	}
	
	Node.prototype.check = function() {
		if (this.count == this.ringsize) {
			if (this.min = this.id) {
				this.setState(LEADER);
			} else {
				this.setState(FOLLOWER);
			}
		}
	}
}
// ****************************************************
//  NODE
// ****************************************************
function Node(x,y,r,graph,id) {
	// Static node_id
	//if (typeof Node.node_id == 'undefined') {
	//	Node.node_id = 0;
	//}
	// Location & Dimensions
	this.x = x || 0;
	this.y = y || 0;
	this.r = r || 15.0;
	this.id = id; //Node.node_id;
	Node.node_id++;
	
	// Adjacency List
	this.adjNodes = [];
	this.adjEdges = [];
	
	// Graph
	this.graph = graph;
	
	// States
	this.state = new State("default","#AAAAAA");
}

Node.prototype.draw = function(ctx) {	
	// Draw node
	ctx.beginPath();
	ctx.arc(this.x, this.y, 15, 0, Math.PI*2, true); 
	ctx.closePath();
	ctx.fillStyle = this.state.color;
	ctx.strokeStyle = "#000000";
	ctx.fill();
	ctx.stroke();
	
	// Draw id
	ctx.font = "16pt Century Gothic";
	ctx.fillStyle = "#000000"
	if (this.id < 10)
		ctx.fillText(""+this.id,this.x-6,this.y+8);
	else
		ctx.fillText(""+this.id,this.x-12,this.y+8);
	
}

/* Link two nodes with an edge by indorming them of their adjencency and their edge */
Node.prototype.link = function(node, edge) {	
	var index = this.adjNodes.push(node)-1; // Push adjacent node
	this.adjEdges[index] = edge; // Push associated edge at same index
}

Node.prototype.contains = function(mx, my) {
    // All we have to do is make sure the Mouse X,Y fall in the area between
    // the shape's X and (X + Height) and its Y and (Y + Height)
	return  (this.x-this.r <= mx) && (this.x + this.r >= mx) &&
        	(this.y-this.r <= my) && (this.y + this.r >= my);
}

Node.prototype.setState = function(newState) {
	this.state = newState;
	this.graph.valid = false;
}

Node.prototype.edgeForAdjacentNode = function(node) {
	var index = -1;
	for (var i = 0; i < this.adjNodes.length; i++) {
		if (this.adjNodes[i] == node) {
			index = i;
		}
	}
	
	if (index >= 0)
		return this.adjEdges[index];
	else
		return null;
}

// ****************************************************
//  EDGE
// ****************************************************
function Edge(node1, node2, graph, strokeColor) {
	// Location & Dimensions
	this.node1 = node1;
	this.node2 = node2;
	this.graph = graph;
	this.strokeColor = strokeColor; // defaults to black
	this.strokeSize = 1;
	
	this.messages = []; // Messages travelling on the edge
}

Edge.prototype.draw = function(ctx) {
	ctx.strokeStyle = this.strokeColor;
	ctx.beginPath();
	ctx.moveTo(this.node1.x,this.node1.y);
	ctx.lineTo(this.node2.x,this.node2.y);
	ctx.lineWidth = this.strokeSize;
	ctx.stroke();
}

Edge.prototype.setColor = function(color) {
	this.strokeColor = color;
	this.graph.valid = false;
}

Edge.prototype.setWidth = function(width) {
	this.strokeSize = width;
	this.graph.valid = false;
}

Edge.prototype.setColorAndWidth = function (color, width) {
	//this.setColor(color);
	//this.setWidth(width);
	this.strokeSize = width;
	this.strokeColor = color;
	this.graph.valid = false;
}

// ****************************************************
//  GRAPH
// ****************************************************
function Graph(canvas) 
{
	// Graph properties
	this.valid = false; // When true, the graph will redraw
	this.graphType = "arbitrary"; // Used to indicate type of graph (ex, complete, line, etc)
	this.isFIFO = true;
	
	this.nodes = []; // Nodes on the graph
	this.edges = [];
	this.messages = []; // Messages travelling on the graph
	
	// Used to allocate node ids. Reset to 0 when graph is re-generated
	Node.node_id = 0;
	
	// Canvas properties
	this.canvas = canvas;
 	this.width = canvas.width;
	this.height = canvas.height;
	this.ctx = canvas.getContext('2d');

	// Dragging data
	this.dragging = false; // Keep track of when we are dragging
  	this.dragoffx = 0;
  	this.dragoffy = 0;
	var html = document.body.parentNode;
	this.htmlTop = html.offsetTop;
	this.htmlLeft = html.offsetLeft;
	
	var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
	if (document.defaultView && document.defaultView.getComputedStyle) {
		this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10)      || 0;
	    this.stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10)       || 0;
	    this.styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10)  || 0;
	    this.styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10)   || 0;
	}
	
	// Mouse dragging event handlers
	canvas.addEventListener('selectstart', function(e) { 
		e.preventDefault(); return false; 
	}, false);
	canvas.addEventListener('mousedown', function(e) {
		var mouse = myGraph.getMouse(e);
		var mx = mouse.x;
		var my = mouse.y;
		var nodes2 = myGraph.nodes;
		var l = nodes2.length;
		for (var i = l-1; i >= 0; i--) {
			if (nodes2[i].contains(mx, my)) {				
				var mySel = nodes2[i];
				// Keep track of where in the object we clicked
				// so we can move it smoothly (see mousemove)
				myGraph.dragoffx = mx - mySel.x;
				myGraph.dragoffy = my - mySel.y;
				myGraph.dragging = true;
				myGraph.selection = mySel;
				myGraph.valid = false;
				return;
			}
		}
		// havent returned means we have failed to select anything.
		// If there was an object selected, we deselect it
		if (myGraph.selection) {
			myGraph.selection = null;
			myGraph.valid = false; // Need to clear the old selection border
		}
	}, true);
	canvas.addEventListener('mousemove', function(e) {
		if (myGraph.dragging) {
			//alert("Moved!");
			var mouse = myGraph.getMouse(e);
			// We don't want to drag the object by its top-left corner, we want to drag it
			// from where we clicked. Thats why we saved the offset and use it here
			myGraph.selection.x = mouse.x - myGraph.dragoffx;
			myGraph.selection.y = mouse.y - myGraph.dragoffy;   
			myGraph.valid = false; // Something's dragging so we must redraw
		}
	}, true);
	canvas.addEventListener('mouseup', function(e) {
		myGraph.dragging = false;
	}, true);
					
	// Drawing code
	var myGraph = this;
	this.interval = 30;
	setInterval(function() {myGraph.draw();}, myGraph.interval);
}

/* Get exact mouse position, used in mouse event handlers */
Graph.prototype.getMouse = function(e) {
  var element = this.canvas, offsetX = 0, offsetY = 0, mx, my;
  
  // Compute the total offset
  if (element.offsetParent !== undefined) {
    do {
      offsetX += element.offsetLeft;
      offsetY += element.offsetTop;
    } while ((element = element.offsetParent));
  }

  // Add padding and border style widths to offset
  // Also add the <html> offsets in case there's a position:fixed bar
  offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
  offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

  mx = e.pageX - offsetX;
  my = e.pageY - offsetY;
  
  // We return a simple javascript object (a hash) with x and y defined
  return {x: mx, y: my};
}

/* Drawing function for the graph. Also delegates the drawing of nodes, messages and edges */
Graph.prototype.draw = function() {
	if (!this.valid) {
		var ctx = this.ctx;

		ctx.canvas.width  = window.innerWidth;
		ctx.canvas.height = window.innerHeight;
		
		this.clearCanvas();
		
		/*for (var i = 0; i < this.nodes.length; i++) {
			this.nodes[i].drawEdges(ctx);
		}*/
		for (var i = 0; i < this.edges.length; i++) {
			this.edges[i].draw(ctx);
		}
		
		for (var i = 0; i < this.nodes.length; i++) {
			this.nodes[i].draw(ctx);
		}
		
		for (var i = 0; i < this.messages.length; i++) {
			this.messages[i].draw(ctx);
		}
		
		this.valid = true;
	}
}

/* Add node to the graph */
Graph.prototype.addNode = function(node) {
	this.nodes.push(node);
	this.valid = false;
}

/* Connect two nodes */
Graph.prototype.connectNodes = function(node1, node2) {
	var edge = new Edge(node1, node2, this, '#000000');
	
	this.edges.push(edge); // Save edge in graph
	node1.link(node2, edge); // Inform nodes of the new edge
	node2.link(node1, edge); 
}

/* Set all nodes to a given state.*/
Graph.prototype.setAllNodeStates = function(nodeState) {
	for (var i = 0; i < this.nodes.length; i++) {
		this.nodes[i].setState(nodeState);
	}
}

/* Set all edges to a given color and width. */
Graph.prototype.setAllEdgesColorAndWidth = function(color, width) {
	for (var i = 0; i < this.edges.length; i++) {
		this.edges[i].setColorAndWidth(color,width);
	}
}

/* Set all nodes and edges to their default state. */
Graph.prototype.reset = function() {
	this.setAllNodeStates(new State("default",'#AAAAAA'));
	this.setAllEdgesColorAndWidth('#000',1);
}

/* Clear graph by removing all nodes and messages. Called before 
   generating a new graph, this graph item is reused instead of 
   deleting it and creating a new one. */
Graph.prototype.clear = function() {
	this.nodes = [];
	this.messages = [];
	this.edges = [];
	Node.node_id = 0;
}

Graph.prototype.clearCanvas = function() {
	this.ctx.clearRect(0, 0, this.width, this.height);
}
/* Check the graph's type to see if its a complete graph. */
Graph.prototype.isComplete = function() {
	return this.graphType=="complete";
}


// ****************************************************
//  Generation API Methods
// ****************************************************

function generateArbitraryGraph(graph, canvas, n, density) {
	// Clear graph
	graph.clear();
	
	if (density == 1) graph.graphType = COMPLETE_GRAPH;
	else if (density == 0) graph.graphType = LINE_GRAPH;
	else graph.graphType = ARBITRARY_GRAPH
	
	var canvasRadius;
	var canvasHeight = canvas.height;
	var canvasWidth = canvas.width-250;
	
	var addLeftOffset = false;
	if (window.innerWidth > 900) {
		var addLeftOffset = true;
		canvasWidth -=250;
	}
	
	if (canvasWidth > canvasHeight) {
		canvasRadius = canvasHeight/2-25;
	} else {
		canvasRadius = canvasWidth/2-25;
	}
	var canvasX = canvasWidth/2;
	if (addLeftOffset) canvasX +=250;
	var canvasY = canvasHeight/2;
	
	// Randomize the order of node ids
	var nodeIndexes = [];
	for (var i = 0; i < n; i++) {nodeIndexes.push(i);}
	nodeIndexes = shuffle(nodeIndexes);
	
	// Add nodes in a circle
	for (var i = 0; i < n; i++) {
		var deg = 360/n*i;
		var rad = deg*Math.PI/180;
		
		var x = canvasRadius*Math.cos(rad)+canvasX;
		var y = canvasRadius*Math.sin(rad)+canvasY;
		graph.addNode(new Node(x,y,15,graph,nodeIndexes[i]));
	}
	
	// Connect graph (basically create a line graph to make sure the graph is connected)
	
	for (var i = 0; i < n-1; i++) {		
		var node1 = graph.nodes[nodeIndexes[i]];
		var node2 = graph.nodes[nodeIndexes[i+1]];
		graph.connectNodes(node1, node2);
	}
	
	// Add random edges
	for (var i = 0; i < n; i++) {
		var n1 = graph.nodes[i];
		var skippedFirst = false;
		
		for (var j = 0; j < n; j++) {
			// Randomize 0 to 1; check if in density
			if (Math.random() <= density && i!=j) {
				var n2 = graph.nodes[j];
				if (n1.adjNodes.indexOf(n2) < 0) {
					if (skippedFirst || density == 1)
						graph.connectNodes(n1,n2);
					skippedFirst = true;
				} 
				
			}
		}	
	}
	
	return graph;
}

function generateCompleteGraph(graph, canvas, n) {
	generateArbitraryGraph(graph, canvas, n, 1);
}

function generateLineGraph(graph, canvas, n) {
	generateArbitraryGraph(graph, canvas, n, 0);
}

function generateRingGraph(graph, canvas, n) {
	// Clear graph
	graph.clear();
	
	graph.graphType = RING_GRAPH;
		
	var canvasRadius;
	var canvasHeight = canvas.height;
	var canvasWidth = canvas.width-250;
	
	var addLeftOffset = false;
	if (window.innerWidth > 900) {
		var addLeftOffset = true;
		canvasWidth -=250;
	}
	
	if (canvasWidth > canvasHeight) {
		canvasRadius = canvasHeight/2-25;
	} else {
		canvasRadius = canvasWidth/2-25;
	}
	var canvasX = canvasWidth/2;
	if (addLeftOffset) canvasX +=250;
	var canvasY = canvasHeight/2;
	
	// Randomize the order of node ids
	var nodeIndexes = [];
	for (var i = 0; i < n; i++) {nodeIndexes.push(i);}
	nodeIndexes = shuffle(nodeIndexes);
	
	// Add nodes in a circle
	for (var i = 0; i < n; i++) {
		var deg = 360/n*i;
		var rad = deg*Math.PI/180;
		
		var x = canvasRadius*Math.cos(rad)+canvasX;
		var y = canvasRadius*Math.sin(rad)+canvasY;
		graph.addNode(new Node(x,y,15,graph,nodeIndexes[i]));
	}
	
	// Connect graph in a ring
	
	for (var i = 0; i < n; i++) {		
		var node1 = graph.nodes[i];
		var node2 = graph.nodes[(i+1)%n];
		graph.connectNodes(node1, node2);
	}
	
	return graph;
}


// ****************************************************
//  Library Methods
// ****************************************************
shuffle = function(o){
	for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
	return o;
};

