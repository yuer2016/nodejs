lazy val commonSettings = Seq(
  organization := "com.yicheng",
  version := "0.1.0",
  scalaVersion := "2.11.7"
)

resolvers += Resolver.mavenLocal

resolvers += "Typesafe Repository" at "http://repo.typesafe.com/typesafe/releases/"

libraryDependencies ++= Seq(
  "com.typesafe.akka" %% "akka-actor" % "2.4.2" 
)

lazy val root = (project in file(".")).
  settings(commonSettings: _*).
  settings(
    name := "hello"
  )

