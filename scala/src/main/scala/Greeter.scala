import akka.actor.Actor

object Greeter {

    case object Greet 
    case object Done
   
}

 class Greeter extends Actor {
        def receive = {
            case Greeter.Greet =>
                println("hello world!");
                sender() ! Greeter.Done
        }
    }