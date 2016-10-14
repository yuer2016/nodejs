object main {

    def main(args:Array[String]):Unit = {
        akka.Main.main(Array(classOf[HelloWorld].getName))
    }
}