var socket = io();
chatting = [];
$(document).ready(function() {
	$("#chat").prop("disabled", true);
	$("#m").prop("disabled", true);
	$("#username").text(username);

	var friendArray = new Array();
	$("#friendUL li").each(function(index) {
		var text = $(this).text();
		friendArray.push(text);
	});
	
	socket.emit("checkOnline", friendArray);
	
	$("form").submit(function() {
		if($("#m").val() !== "") {
			socket.emit("chat message", $("#m").val().toString(), $("li.active a").text()); //Current Tab
			$("#m").val("");
		}
		return false;
	});

	socket.on("listOfOnlineFriends", function(onlineFriends) {
      $("ul li.friend").filter(function() {
        return onlineFriends.indexOf($(this).text()) > -1;
      }).addClass("online");
	});

	socket.on("chat message", function(msg, from) {
			var usernameQuery = $("[id^=atab]").filter(function() {
        return $(this).text() === from;
      });

			$("#" + $(usernameQuery).attr("id").substring(1, 5)).append(msg);
	});

	$("#add").click(function() {
		alertify.prompt("Who would you like to add?", function (e, str) {
			if(str) {
        socket.emit("addFriend", str);
			 alertify.log("Request Sent");
      }
		});
	});

	socket.on("errorOccurred", function(error) {
		if(error !== "") alertify.error(error);
	});

	socket.on("friendRequest", function(friend) {
		alertify.confirm(friend + " would like to be your friend.", function (e) {
		    if (e) socket.emit("friendAccepted", friend);
		    else  socket.emit("friendDenied", friend);
		});
	});

	socket.on("notification", function(notification) {
		for(var i = 0; i < notification.length; i++) {
			if(notification[i].type === "notification") alertify.alert(notification[i].content);
			else if (notification[i].type === "pendingFriend") {
				(function(num) {
					alertify.confirm(notification[num].content + " would like to be your friend.", function (e) {
						if(e) {
							socket.emit("friendAccepted", notification[num].content);
						} else socket.emit("friendDenied", notification[num].content);
					});
				})(i);
			}
			socket.emit("removeNotification", notification[i]);
		}
	});

	socket.on("addFriendtoList", function(friend, online) {
		if(online) $("#friendUL").append("<li class = 'friend online'>" + friend + "</li>");
		else $("#friendUL").append("<li class = 'friend'>" + friend + "</li>");
	});

	$("#friendUL").on("click", ".friend", function(e) {
		if($(this).hasClass("selected")) {
			$("#remove").hide();
			$("#add").show();
			$(this).toggleClass("selected");
			$("#chat").prop("disabled", true);
		} else {
			$("#remove").show();
			$("#add").hide();
			$(".selected").removeClass("selected");
			$(this).toggleClass("selected");
			$("#chat").prop("disabled", false);
      if($(this).hasClass("online")) $("#chat").text("Chat");
      else $("#chat").text("Send Message");
		}
	});

	$("#remove").click(function() { //Button to remove friend from list
		var remove = $(".selected").text();
		socket.emit("remove", remove);
    alertify.log(remove + " has been removed from your list of friends.");
	});

	socket.on("removeFriendFromList", function(friend) {
		$(".selected").remove();
		$("#remove").hide();
		$("#add").show();
		$("#chat").show();
	});

	socket.on("userConnected", function(user) {
		var notOnline = [];
		var offlineFriends = $("li.friend:not(.online)");
		offlineFriends.each(function(i, e) {
			notOnline.push($(e).text());
		});

		if(notOnline.indexOf(user) > -1) {
      $("li.friend").filter(function() {
        return $(this).text() === user;
      }).addClass("online");
    }
	});

	socket.on("userDisconnected", function(disconnectedUsername, type) {
		var username = $("#username").text();
		
    if(type === "disconnect") {
			var online = [];
			var onlineFriends = $("li.friend.online");
			onlineFriends.each(function(i, e) {
				online.push($(e).text());
			});
			if(online.indexOf(disconnectedUsername) > -1) {
        $("li.friend").filter(function() {
          return $(this).text() === disconnectedUsername;
        }).removeClass("online");
      }
		}
		for(var i = 0; i < chatting.length; i++) {
			if(chatting[i] === disconnectedUsername) {
				var msg = "<li>-- " + disconnectedUsername + " has ceased chatting with you. --</li>";
				var j = i + 1;
				var tab = "ul#tab" + j.toString();
				$(tab).append(msg);
				chatting[i] = undefined;
				alertify.log(disconnectedUsername + " has left the chat.");
			}
		}
	});

	$("#chat").click(function() {
		var friend = $(".selected").text();
		if($(".selected").hasClass("online")) {
			socket.emit("initiateChat", friend);
			$(".selected").removeClass("selected");
      $(this).prop("disabled", true);
		} else { //Clicked on offline user, direct messaging
			alertify.prompt("Please enter a message: ", function (ok, str) {
				if (ok) {
					socket.emit("sendMessageOffline", friend, str);
					alertify.log("Message Sent");
				}
			});
		}
	});

	socket.on("beginChat", function(friend) {
		chatting.push(friend);
		$("#m").prop("disabled", false);
		$(".selected").removeClass("selected");
		$("#chat").prop("disabled", true);
		$("li.active").removeClass("active");
		$("ul.active").removeClass("active");

    var chattingTab = $("a").filter(function() { //Finds tab if users are already chatting
      return $(this).text() === friend;
    })[0];

		if(chattingTab) { //If tab for chat already exists, then clear that tab
			var id = chattingTab.id.substring(1);
			$("#" + id).remove();
			$("#" + id + "close").remove();
			chattingTab.remove();
		}

		var tab = "tab" + chatting.length.toString();
		var tabID = "#" + tab;
		$("ul.tab-links").append("<li class = 'active'><a id = a" + tab + " href = " + tabID + ">" + friend + "</a><span class = \"closeTab\" id = \"" + tab + "close\">&#10006</span></li>");
		$("div.tab-content").append("<ul id=" + tab + " class=tab></ul>");
		$("ul" + tabID).addClass("active");
	});

	socket.on("startChat", function(user) {
		alertify.confirm(user + " would like to chat with you.", function (e) {
			if (e) socket.emit("chatAccepted", user);
			else socket.emit("chatDenied", user);
		});
	});

	socket.on("chatDenied", function(user) {
		alertify.log(user + " does not want to chat.");
	});	

	$(".tabs .tab-links").on("click", "a", function(e)  {
		var currentAttrValue = $(this).attr("href");
		$(".tabs " + currentAttrValue).show().siblings().hide();
		$(this).parent("li").addClass("active").siblings().removeClass("active");
		e.preventDefault();
	});
	
	$(document).on("click", ".closeTab", function() {
		var tab = $(this).attr("id");
		var tabContent = tab.substring(0, tab.indexOf("close"));
		if(chatting.indexOf($("#a" + tabContent).text()) > -1) {
			chatting.splice($("#a" + tabContent).text(), 1);
			var tabAnchor = $("#a" + tabContent).text();
			socket.emit("closedTab", tabAnchor);
		}

		$(this).remove();
		$("#a" + tabContent).remove();
		$("#" + tabContent).remove();
	});
});