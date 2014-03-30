<%inherit file="scottclarkio:templates/layout.mako"/>

<!-- Left pic/contact -->
    <div class="container-fluid">
      <div class="row-fluid">
        <div class="span3">
          <div class="well sidebar-nav">
            <center><img src="${request.static_url('scottclarkio:static/img/scott_clark.jpg')}" ></center> 
            <ul class="nav nav-list">
              <li class="nav-header"><h4>Scott Clark</h4></li>
              <li><a href="mailto:scott@scottclark.io" target="_blank"><i class="fa fa-envelope"></i> scott@scottclark.io</a></li>
              <li><a href="http://www.facebook.com/therealscottclark" target="_blank"><i class="fa fa-facebook"></i> fb.com/therealscottclark</a></li>
              <li><a href="http://www/twitter.com/DrScottClark" target="_blank"><i class="fa fa-twitter"></i> @DrScottClark</a></li>
              <li><a href="http://www.linkedin.com/pub/scott-clark/A/358/B39" target="_blank"><i class="fa fa-linkedin-square"></i> linkedin.com/in/sc932</a></li>
              <li><a href="http://www.github.com/sc932" target="_blank"><i class="fa fa-github"></i> github.com/sc932</a></li>
            </ul>
          </div><!--/.well -->
        </div><!--/span-->
        <div class="span9"> 
            <div id="wrap>
                <div id="content">
                    ${next.body()}
                </div>
            </div>
        </div>
