<%inherit file="scottclarkio:templates/contact_card_view.mako"/>

    <div class="container-fluid">
        <div class="row-fluid">
            <div class="span12"> 
                <%include file="scottclarkio:templates/about_author.mako"/>
            </div>
        </div>
        <div class="row-fluid">
            <div class="span12"> 
                <!-- Main welcome -->
                    <h4>Tools used building this site</h4>
                    <h5>Domain registration and DNS</h5>
                    <p><a href="http://www.iwantmyname.com" target="_blank">iwantmyname.com</a> - These guys are the best domain registrar out there. Competitive prices, simple ordering and great customer service. Their dashboard makes it super simple to use a myriad of online services with your new domain; from AWS S3 to google apps to heroku and dozens more. DNS is included. Highly recommended.</p>
                    <h5>Static content hosting</h5>
                    <p><a href="http://aws.amazon.com/s3/" target="_blank">AWS S3</a> - Cheap hosting that scales with your demand. You are not charged for bandwidth that you don't use and the uptime is incredible.</p>
                    <p><a href="http://s3tools.org/s3cmd" target="_blank">s3cmd</a> - This is a must have (and open source!) tool for use with S3. Allows you to easily upload and sync files locally to your S3 buckets from the command line. Can't live without it.</p>
                    <h5>Email tools</h5>
                    <p><a href="http://www.google.com/enterprise/apps/business/" target="_blank">Google Apps</a> - Free for up to 10 accounts. Quick and painless setup. Full use of the google apps suite. Can't go wrong.</p>
                    <h5>HTML/CSS templates and JS</h5>
                    <p><a href="http://twitter.github.com/bootstrap" target="_blank">Twitter Bootstrap</a> - An amazingly rich CSS template by Twitter. Open source and easy to use.</p>
                    <p><a href="http://fortawesome.github.com/Font-Awesome/" target="_blank">Font Awesome</a> - A great extension to Twitter Bootstrap with lots of extra features (and amazing icons). Open source and quick integration. </p>
                    <p><a href="http://jquery.com" target="_blank">jQuery</a> - The best javascript framework bar none. Required by Twitter Bootstrap. Open Source.</p>
            </div> <!--/span-->
        </div> <!--/row-->
    </div> <!-- /container -->

