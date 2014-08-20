<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Scott Clark</title>
  <meta name="keywords" content="python web application" />
  <meta name="description" content="pyramid web application" />
  <link rel="shortcut icon" href="${request.static_url('scottclarkio:static/ico/favicon.ico')}" />
  <link rel="stylesheet" href="//netdna.bootstrapcdn.com/bootstrap/2.3.2/css/bootstrap.min.css" type="text/css" media="all" charset="utf-8" />
  <link href="//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css" rel="stylesheet">
  <!-- start Mixpanel -->
  <script type="text/javascript">(function(f,b){if(!b.__SV){var a,e,i,g;window.mixpanel=b;b._i=[];b.init=function(a,e,d){function f(b,h){var a=h.split(".");2==a.length&&(b=b[a[0]],h=a[1]);b[h]=function(){b.push([h].concat(Array.prototype.slice.call(arguments,0)))}}var c=b;"undefined"!==typeof d?c=b[d]=[]:d="mixpanel";c.people=c.people||[];c.toString=function(b){var a="mixpanel";"mixpanel"!==d&&(a+="."+d);b||(a+=" (stub)");return a};c.people.toString=function(){return c.toString(1)+".people (stub)"};i="disable track track_pageview track_links track_forms register register_once alias unregister identify name_tag set_config people.set people.set_once people.increment people.append people.track_charge people.clear_charges people.delete_user".split(" ");
for(g=0;g<i.length;g++)f(c,i[g]);b._i.push([a,e,d])};b.__SV=1.2;a=f.createElement("script");a.type="text/javascript";a.async=!0;a.src="//cdn.mxpnl.com/libs/mixpanel-2.2.min.js";e=f.getElementsByTagName("script")[0];e.parentNode.insertBefore(a,e)}})(document,window.mixpanel||[]);
  mixpanel.init("f2ee630605bb4c4dc5691423b89a3dfb");</script>
  <!-- end Mixpanel -->
</head>
<body>

<!-- Nav bar -->
    <div class="navbar navbar-fixed-top">
      <div class="navbar-inner">
        <div class="container-fluid">
          <a class="brand" id="left-nav-brand" href="${request.route_url('home')}">Scott Clark</a>
          <div class="nav-collapse">
            <ul class="nav">
              % if route_type == 'home': 
                <li class="active">
              % else:
                <li>
              % endif
              <a id="left-nav-home" href="${request.route_url('home')}">Home</a></li>
              % if route_type == 'blog': 
                <li class="active">
              % else:
                <li>
              % endif
              <a id="left-nav-home" href="blog">Blog</a></li>
              <li><a id="left-nav-resume" href="http://github.com/sc932/resume" target="_blank">Resume/CV</a></li>
              % if route_type == 'about': 
                <li class="active">
              % else:
                <li>
              % endif
              <a id="left-nav-about" href="${request.route_url('about')}">About</a></li>
            </ul>
            <ul class="nav pull-right">
              <li><a id="right-nav-email" href="mailto:scott@scottclark.io" target="_blank"><i class="fa fa-envelope"></i></a></li>
              <li><a id="right-nav-fb" href="http://www.facebook.com/therealscottclark" target="_blank"><i class="fa fa-facebook"></i></a></li>
              <li><a id="right-nav-twitter" href="http://www.twitter.com/DrScottClark" target="_blank"><i class="fa fa-twitter"></i></a></li>
              <li><a id="right-nav-linkedin" href="http://www.linkedin.com/pub/scott-clark/A/358/B39" target="_blank"><i class="fa fa-linkedin-square"></i></a></li>
              <li><a id="right-nav-github" href="http://www.github.com/sc932" target="_blank"><i class="fa fa-github"></i></a></li>
            </ul>
          </div><!--/.nav-collapse -->
        </div>
      </div>
    </div>

  <div id="wrap">
    <div id="content" style="padding-top:60px;">
      ${next.body()}
    </div>
  </div>

<!-- footer -->
      <hr>
      <footer>
      <center><p>
          <a id="footer-nav-home" href="${request.route_url('home')}">Home</a> | 
          <a id="footer-nav-blog" href="${request.route_url('blog_index')}">Blog</a> | 
          <a id="footer-nav-resume" href="http://github.com/sc932/resume">Resume/CV</a> | 
          <a id="footer-nav-about" href="${request.route_url('about')}">About</a>
      </p></center>
      <center><p>
              <a id="footer-nav-email" href="mailto:scott@scottclark.io" target="_blank"><i class="fa fa-envelope"></i></a> | 
              <a id="footer-nav-fb" href="http://www.facebook.com/therealscottclark" target="_blank"><i class="fa fa-facebook"></i></a> | 
              <a id="footer-nav-twitter" href="http://www.twitter.com/DrScottClark" target="_blank"><i class="fa fa-twitter"></i></a> | 
              <a id="footer-nav-linkedin" href="http://www.linkedin.com/pub/scott-clark/A/358/B39" target="_blank"><i class="fa fa-linkedin-square"></i></a> | 
              <a id="footer-nav-github" href="http://www.github.com/sc932" target="_blank"><i class="fa fa-github"></i></a>
      </p></center>
        <%
        from pyramid.security import authenticated_userid
        user_id = authenticated_userid(request)
        %>
        <center>
        % if user_id:
            Signed in as <strong>${user_id}</strong> ::
            <a href="${request.route_url('auth',action='out')}">Sign out <i class="fa fa-sign-out"></i></a>
        %else:
        %endif
        </center>
        <center><p>&copy; Scott Clark 2012-14 | <a id="footer-fork" href="http://www.github.com/sc932/scottclarkio" target="_blank">fork on github</a></p></center>
      </footer>
</body>

<!-- Mixpanel tracking -->
<script type="text/javascript">
    mixpanel.track_links(
            "#left-nav-brand",
            "click left nav brand", {
                "uri": document.documentURI,
            });
    mixpanel.track_links(
            "#left-nav-home",
            "click left nav email", {
                "uri": document.documentURI,
            });
    mixpanel.track_links(
            "#left-nav-blog",
            "click left nav fb", {
                "uri": document.documentURI,
            });
    mixpanel.track_links(
            "#left-nav-resume",
            "click left nav twitter", {
                "uri": document.documentURI,
            });
    mixpanel.track_links(
            "#left-nav-about",
            "click left nav linkedin", {
                "uri": document.documentURI,
            });
    mixpanel.track_links(
            "#right-nav-email",
            "click right nav email", {
                "uri": document.documentURI,
            });
    mixpanel.track_links(
            "#right-nav-fb",
            "click right nav fb", {
                "uri": document.documentURI,
            });
    mixpanel.track_links(
            "#right-nav-twitter",
            "click right nav twitter", {
                "uri": document.documentURI,
            });
    mixpanel.track_links(
            "#right-nav-linkedin",
            "click right nav linkedin", {
                "uri": document.documentURI,
            });
    mixpanel.track_links(
            "#right-nav-github",
            "click right nav github", {
                "uri": document.documentURI,
            });
    mixpanel.track_links(
            "#footer-nav-home",
            "click footer nav email", {
                "uri": document.documentURI,
            });
    mixpanel.track_links(
            "#footer-nav-blog",
            "click footer nav fb", {
                "uri": document.documentURI,
            });
    mixpanel.track_links(
            "#footer-nav-resume",
            "click footer nav twitter", {
                "uri": document.documentURI,
            });
    mixpanel.track_links(
            "#footer-nav-about",
            "click footer nav linkedin", {
                "uri": document.documentURI,
            });
    mixpanel.track_links(
            "#footer-nav-email",
            "click footer nav email", {
                "uri": document.documentURI,
            });
    mixpanel.track_links(
            "#footer-nav-fb",
            "click footer nav fb", {
                "uri": document.documentURI,
            });
    mixpanel.track_links(
            "#footer-nav-twitter",
            "click footer nav twitter", {
                "uri": document.documentURI,
            });
    mixpanel.track_links(
            "#footer-nav-linkedin",
            "click footer nav linkedin", {
                "uri": document.documentURI,
            });
    mixpanel.track_links(
            "#footer-nav-github",
            "click footer nav github", {
                "uri": document.documentURI,
            });
    mixpanel.track_links(
            "#footer-fork",
            "click footer fork", {
                "uri": document.documentURI,
            });
</script>
<!-- END Mixpanel tracking -->

<script>
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-49537011-1', 'scottclark.io');
  ga('send', 'pageview');

</script>

</html>
