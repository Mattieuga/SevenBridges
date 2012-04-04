	var executionQueue = null;
	
	function replayTutorial() {
		eraseCookie("doneTut");
		tutorial();
	}
	
	function tutorial() {
		if (readCookie("doneTut") != "true") {
			//Save cookie
			createCookie("doneTut","true");
			
			$("#overlay").css("display","block");
			executionQueue = new ExecutionQueue();
			
			executionQueue.add(displaySettingsCallout);
			executionQueue.add(displayGenerateCallout);
			executionQueue.add(displaySpeedCallout);
			executionQueue.add(displayAlgCallout);
			executionQueue.add(displayNodeCallout);
			executionQueue.add(finishTutorial);
			executionQueue.start();
			$("#overlay").unbind('click');
			$("#overlay").click(function() {executionQueue.next()});
		}
	}

	function alerting() {
		alert("Asd");
	}
	function _hideAllCalloutsBut(callout) {
		$("#tut1").css("display","none");
		$("#tut2").css("display","none");
		$("#tut3").css("display","none");
		$("#tut4").css("display","none");
		$("#tut5").css("display","none");
		
		if (callout)
			callout.css("display","block");
	}
	
	function displaySettingsCallout() {
		showCallout($("#tut1"), $("span:contains('Nodes')").offset(), {topO:20,leftO:240});
	}
	function displayGenerateCallout() {
		showCallout($("#tut2"), $("span:contains('Generate')").offset(), {topO:25,leftO:240})
	}
	function displaySpeedCallout() {
		showCallout($("#tut3"), $("span:contains('Speed')").offset(), {topO:20,leftO:240})	
	}
	function displayAlgCallout() {
		showCallout($("#tut4"), $("span:contains('Flood')").offset(), {topO:20,leftO:240})
	}
	function displayNodeCallout() {
		showCallout($("#tut5"), $("#canvas").offset(), {topO:-(window.innerHeight/2-$("#tut5").height()/2),leftO:-(window.innerWidth/2-$("#tut5").width()/2)})
	}
	
	function showCallout(callout, location, offset) {
		_hideAllCalloutsBut(callout);
		
		//var slider = $("span:contains('Generate')");
		//var sliderLocation = slider.offset();
		callout.css("top",""+(location.top-offset.topO)+"px");
		callout.css("left",""+(location.left-offset.leftO)+"px");		
		callout.show( "drop", {}, 200, callback);
		function callback() {
			callout.css("top",""+(location.top-offset.topO)+"px");
			callout.css("left",""+(location.left-offset.leftO)+"px");		
		};
	}
	
	
	function finishTutorial() {
		_hideAllCalloutsBut(null);
		$("#overlay").css("display","none");
		$("#overlay").unbind('click');
		$("#overlay").css("display","none");
	}
	
	function ExecutionQueue() {
		this.queue = [];
		this.index = -1;
		this.cancelled = false;
		this.finished = false;
	}
	
	ExecutionQueue.prototype.add = function (sequenceFunction) {
			this.queue.push(sequenceFunction);
	}
		
	ExecutionQueue.prototype.start = function () {
			this.index = -1;
			this.aborted = false;
			this.next();
			if (typeof(this.onStart)=="function") 
				this.onStart();
	}
		
	ExecutionQueue.prototype.end = function () {
			if (typeof(this.onEnd)=="function") 
				this.onEnd();
			this.finished = true;
	}
		
	ExecutionQueue.prototype.next = function () {
			if (this.aborted) 
				return;
			this.index++;
			if (this.index == this.queue.length) 
				return this.end();
			var currentFct = this.queue[this.index];
			if (currentFct)
				currentFct();
	}
		
	ExecutionQueue.prototype.abort = function () {
			this.index = -1;
			this.aborted = true;
	}
	
	
	
	function createCookie(name,value) {
		document.cookie = name+"="+value+";expires=Fri, 6 Apr 2012 24:47:11 UTC"+"; path=/";
	}

	function readCookie(name) {
		var nameEQ = name + "=";
		var ca = document.cookie.split(';');
		for(var i=0;i < ca.length;i++) {
			var c = ca[i];
			while (c.charAt(0)==' ') c = c.substring(1,c.length);
			if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
		}
		return null;
	}
	function eraseCookie(name) {
		createCookie(name,"",-1);
	}