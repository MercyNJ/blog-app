-- MySQL dump 10.13  Distrib 8.0.36, for Linux (x86_64)
--
-- Host: localhost    Database: blog_dev_db
-- ------------------------------------------------------
-- Server version	8.0.36-0ubuntu0.20.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Comments`
--

DROP TABLE IF EXISTS `Comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `postId` int NOT NULL,
  `authorId` int NOT NULL,
  `content` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `postId` (`postId`),
  KEY `authorId` (`authorId`),
  CONSTRAINT `Comments_ibfk_1` FOREIGN KEY (`postId`) REFERENCES `Posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Comments_ibfk_2` FOREIGN KEY (`authorId`) REFERENCES `Users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Comments`
--

LOCK TABLES `Comments` WRITE;
/*!40000 ALTER TABLE `Comments` DISABLE KEYS */;
INSERT INTO `Comments` VALUES (9,4,1,'We will be here soon','2024-06-24 09:23:52','2024-06-24 09:23:52'),(12,4,1,'Yes More Coming Soon!','2024-06-25 07:47:26','2024-06-25 07:47:34'),(14,6,1,'Hooray!','2024-06-25 08:28:41','2024-06-25 08:28:48');
/*!40000 ALTER TABLE `Comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Posts`
--

DROP TABLE IF EXISTS `Posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Posts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` text NOT NULL,
  `summary` text NOT NULL,
  `content` text NOT NULL,
  `cover` varchar(255) DEFAULT NULL,
  `resizedCover` varchar(255) DEFAULT NULL,
  `category` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `authorId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `authorId` (`authorId`),
  CONSTRAINT `Posts_ibfk_1` FOREIGN KEY (`authorId`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Posts`
--

LOCK TABLES `Posts` WRITE;
/*!40000 ALTER TABLE `Posts` DISABLE KEYS */;
INSERT INTO `Posts` VALUES (1,'Hey and Welcome To','Vestibulum non nulla id est vehicula convallis. Cras egestas, nisi ac viverra consectetur, lorem lorem pharetra sem, ac congue sapien arcu sit amet velit. Nam lacinia, ipsum nec blandit molestie, lorem mi cursus ex, at facilisis arcu justo a justo.','<p>Vestibulum non nulla id est vehicula convallis. Cras egestas, nisi ac viverra consectetur, lorem lorem pharetra sem, ac congue sapien arcu sit amet velit. Nam lacinia, ipsum nec blandit molestie, lorem mi cursus ex, at facilisis arcu justo a justo. Curabitur tincidunt felis at urna volutpat dapibus. Aenean malesuada lacus non lectus pellentesque, sed pretium ex posuere. Vestibulum ultricies est non tortor tristique, in malesuada metus convallis. Integer laoreet ipsum nec quam dictum, id convallis metus tristique. Morbi volutpat magna non ex rhoncus, quis vehicula metus tincidunt. Vivamus dapibus neque sed lectus aliquam, ac tincidunt dui vulputate. Suspendisse potenti. Pellentesque tincidunt risus id magna auctor, quis interdum metus fermentum. Fusce ac urna nec urna feugiat tristique nec sit amet felis. Curabitur et dictum ligula.</p>','uploads/72caacf1f1f567d4e654a69ab286e5a4.jpg','uploads/72caacf1f1f567d4e654a69ab286e5a4_resized.jpg','grief','2024-06-18 17:46:02','2024-06-18 17:46:02',1),(2,'My Blog','In ornare nisi at ex dictum, non lacinia odio facilisis. Fusce vulputate magna nec urna suscipit tincidunt. Integer quis quam eget dolor interdum tincidunt. Etiam eget urna vitae ante pharetra fermentum. ','<p>Mauris convallis magna at enim elementum, ut fermentum ligula feugiat. Praesent rutrum consequat est, vel aliquam lacus efficitur in. Quisque at libero a odio gravida ullamcorper. Nunc quis metus nec eros suscipit auctor in id mauris. Suspendisse potenti. Praesent at enim sit amet orci tempor aliquam. Sed scelerisque nulla et risus faucibus, at bibendum eros fermentum. Cras et lectus in velit malesuada vestibulum. Curabitur vehicula, nisl id sagittis viverra, lorem velit fringilla augue, sed varius sapien nisi eget augue.</p><p>In ornare nisi at ex dictum, non lacinia odio facilisis. Fusce vulputate magna nec urna suscipit tincidunt. Integer quis quam eget dolor interdum tincidunt. Etiam eget urna vitae ante pharetra fermentum. Phasellus feugiat lacus ut arcu feugiat, sit amet convallis est pharetra. Ut imperdiet velit in massa vehicula, nec interdum mi gravida. Nulla facilisi. Vestibulum feugiat eros sit amet eros porttitor, sit amet tincidunt nisi aliquet. Ut lobortis dolor ut erat condimentum, ac convallis magna aliquam. Proin nec est bibendum, dictum nisl in, congue eros. Nulla facilisi.</p>','uploads/df0db86134d133354df316446fdca83a.jpg','uploads/df0db86134d133354df316446fdca83a_resized.jpg','grief','2024-06-18 17:47:19','2024-06-18 17:47:19',1),(3,'Posts Coming Soon','Mauris convallis magna at enim elementum, ut fermentum ligula feugiat. Praesent rutrum consequat est, vel aliquam lacus efficitur in. Quisque at libero a odio gravida ullamcorper. Nunc quis metus nec eros suscipit auctor in id mauris. ','<p>Mauris convallis magna at enim elementum, ut fermentum ligula feugiat. Praesent rutrum consequat est, vel aliquam lacus efficitur in. Quisque at libero a odio gravida ullamcorper. Nunc quis metus nec eros suscipit auctor in id mauris. Suspendisse potenti. Praesent at enim sit amet orci tempor aliquam. Sed scelerisque nulla et risus faucibus, at bibendum eros fermentum. Cras et lectus in velit malesuada vestibulum. Curabitur vehicula, nisl id sagittis viverra, lorem velit fringilla augue, sed varius sapien nisi eget augue.</p><p>In ornare nisi at ex dictum, non lacinia odio facilisis. Fusce vulputate magna nec urna suscipit tincidunt. Integer quis quam eget dolor interdum tincidunt. Etiam eget urna vitae ante pharetra fermentum. Phasellus feugiat lacus ut arcu feugiat, sit amet convallis est pharetra. Ut imperdiet velit in massa vehicula, nec interdum mi gravida. Nulla facilisi. Vestibulum feugiat eros sit amet eros porttitor, sit amet tincidunt nisi aliquet. Ut lobortis dolor ut erat condimentum, ac convallis magna aliquam. Proin nec est bibendum, dictum nisl in, congue eros. Nulla facilisi.</p>','uploads/c8a743aad9a73e97a4793ee8b1bed582.jpg','uploads/c8a743aad9a73e97a4793ee8b1bed582_resized.jpg','mental-wellness','2024-06-18 17:48:29','2024-06-18 17:48:29',1),(4,'Stay Tuned!','In ornare nisi at ex dictum, non lacinia odio facilisis. Fusce vulputate magna nec urna suscipit tincidunt. Integer quis quam eget dolor interdum tincidunt. Etiam eget urna vitae ante pharetra fermentum.','<p>Mauris convallis magna at enim elementum, ut fermentum ligula feugiat. Praesent rutrum consequat est, vel aliquam lacus efficitur in. Quisque at libero a odio gravida ullamcorper. Nunc quis metus nec eros suscipit auctor in id mauris. Suspendisse potenti. Praesent at enim sit amet orci tempor aliquam. Sed scelerisque nulla et risus faucibus, at bibendum eros fermentum. Cras et lectus in velit malesuada vestibulum. Curabitur vehicula, nisl id sagittis viverra, lorem velit fringilla augue, sed varius sapien nisi eget augue.</p><p>In ornare nisi at ex dictum, non lacinia odio facilisis. Fusce vulputate magna nec urna suscipit tincidunt. Integer quis quam eget dolor interdum tincidunt. Etiam eget urna vitae ante pharetra fermentum. Phasellus feugiat lacus ut arcu feugiat, sit amet convallis est pharetra. Ut imperdiet velit in massa vehicula, nec interdum mi gravida. Nulla facilisi. Vestibulum feugiat eros sit amet eros porttitor, sit amet tincidunt nisi aliquet. Ut lobortis dolor ut erat condimentum, ac convallis magna aliquam. Proin nec est bibendum, dictum nisl in, congue eros. Nulla facilisi.</p>','uploads/c3e3c65801c175864a214d2c7f083ecd.jpg','uploads/c3e3c65801c175864a214d2c7f083ecd_resized.jpg','grief','2024-06-18 17:55:52','2024-06-25 07:47:05',1),(6,'Be Expectant!','Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida.','<p>Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula. Donec lobortis risus a elit. Etiam tempor. Ut ullamcorper, ligula eu tempor congue, eros est euismod turpis, id tincidunt sapien risus a quam. Maecenas fermentum consequat mi. Donec fermentum. Pellentesque malesuada nulla a mi. Duis sapien sem, aliquet nec, commodo eget, consequat quis, neque. Aliquam faucibus, elit ut dictum aliquet, felis nisl adipiscing sapien, sed malesuada diam lacus eget erat. Cras mollis scelerisque nunc. Nullam arcu. Aliquam consequat. Curabitur augue lorem, dapibus quis, laoreet et, pretium ac, nisi.</p><p>Aenean sit amet arcu nec leo feugiat posuere. Nulla facilisi. Vestibulum posuere, massa et fermentum facilisis, turpis augue cursus tortor, nec aliquet elit sapien et nisl. Ut tempor diam id magna ultricies, eget dictum nulla viverra. Proin ac velit dictum, suscipit libero id, feugiat augue. Suspendisse potenti. Morbi euismod urna id nisi dignissim, a congue dolor vehicula. Integer malesuada, urna et convallis auctor, sem odio auctor libero, sit amet posuere erat nulla vel mi. In et arcu sed diam elementum tincidunt. Maecenas ac scelerisque sapien.</p><p>Mauris convallis magna at enim elementum, ut fermentum ligula feugiat. Praesent rutrum consequat est, vel aliquam lacus efficitur in. Quisque at libero a odio gravida ullamcorper. Nunc quis metus nec eros suscipit auctor in id mauris. Suspendisse potenti. Praesent at enim sit amet orci tempor aliquam. Sed scelerisque nulla et risus faucibus, at bibendum eros fermentum. Cras et lectus in velit malesuada vestibulum. Curabitur vehicula, nisl id sagittis viverra, lorem velit fringilla augue, sed varius sapien nisi eget augue.</p>','uploads/7f5301777dc1333306180a62f4e07d18.jpg','uploads/7f5301777dc1333306180a62f4e07d18_resized.jpg','grief','2024-06-25 07:49:01','2024-06-25 08:29:09',1);
/*!40000 ALTER TABLE `Posts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Users`
--

DROP TABLE IF EXISTS `Users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Users`
--

LOCK TABLES `Users` WRITE;
/*!40000 ALTER TABLE `Users` DISABLE KEYS */;
INSERT INTO `Users` VALUES (1,'Mercy','$2a$10$wAGWO3dCNQNKUBJplh9gdenlpiqR689RnVxnA/g8ilJkp5SCMgD3W','2024-06-18 17:44:21','2024-06-18 17:44:21');
/*!40000 ALTER TABLE `Users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-06-25 11:51:41
